CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

DO $$ BEGIN
    ALTER TYPE status_trigger_type ADD VALUE IF NOT EXISTS 'client_reopen';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE message_delivery_status AS ENUM ('pending', 'delivered', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Administrators can exist before company onboarding. Pre-company audit records
-- intentionally have no company and therefore never appear in tenant policies.
ALTER TABLE audit_logs ALTER COLUMN company_id DROP NOT NULL;
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_user_company_role;
ALTER TABLE users ADD CONSTRAINT chk_user_company_role CHECK (
    (company_id IS NULL AND role IN ('admin', 'unassigned_operator')) OR
    (company_id IS NOT NULL AND role <> 'unassigned_operator')
);

-- Service tokens are never retained in plaintext.
ALTER TABLE bot_configs ADD COLUMN IF NOT EXISTS bot_token_hash varchar(64);
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'bot_configs' AND column_name = 'bot_token'
    ) THEN
        UPDATE bot_configs
        SET bot_token_hash = encode(public.digest(bot_token, 'sha256'), 'hex')
        WHERE bot_token_hash IS NULL;
    END IF;
END $$;
ALTER TABLE bot_configs ALTER COLUMN bot_token_hash SET NOT NULL;
ALTER TABLE bot_configs DROP COLUMN IF EXISTS bot_token;

-- Immutable schedule snapshots provide the schedule actually used by every
-- ticket and cycle, independent of later company edits.
ALTER TABLE company_schedules
    ALTER COLUMN start_time TYPE time without time zone USING start_time::time,
    ALTER COLUMN end_time TYPE time without time zone USING end_time::time;
CREATE TABLE IF NOT EXISTS company_schedule_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    version integer NOT NULL CHECK (version > 0),
    schedule jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_company_schedule_version UNIQUE (company_id, version)
);
INSERT INTO company_schedule_versions (company_id, version, schedule)
SELECT c.id, 1,
       COALESCE(
           jsonb_agg(
               jsonb_build_object(
                   'day_of_week', s.day_of_week,
                   'is_working_day', s.is_working_day,
                   'start_time', s.start_time,
                   'end_time', s.end_time,
                   'timezone', s.timezone
               ) ORDER BY s.day_of_week
           ) FILTER (WHERE s.id IS NOT NULL),
           '[]'::jsonb
       )
FROM companies c
LEFT JOIN company_schedules s ON s.company_id = c.id
GROUP BY c.id
ON CONFLICT (company_id, version) DO NOTHING;

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS schedule_version_id uuid;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS current_cycle_number integer NOT NULL DEFAULT 1;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS closed_by_user_id uuid;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS last_operator_id uuid;
UPDATE tickets t
SET schedule_version_id = v.id
FROM company_schedule_versions v
WHERE v.company_id = t.company_id AND v.version = 1 AND t.schedule_version_id IS NULL;
UPDATE tickets
SET last_operator_id = assigned_operator_id
WHERE status = 'closed' AND last_operator_id IS NULL;
ALTER TABLE tickets ALTER COLUMN schedule_version_id SET NOT NULL;
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS fk_tickets_schedule_version;
ALTER TABLE tickets ADD CONSTRAINT fk_tickets_schedule_version
    FOREIGN KEY (schedule_version_id) REFERENCES company_schedule_versions(id);
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS fk_tickets_closed_by;
ALTER TABLE tickets ADD CONSTRAINT fk_tickets_closed_by
    FOREIGN KEY (closed_by_user_id) REFERENCES users(id);
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS fk_tickets_last_operator;
ALTER TABLE tickets ADD CONSTRAINT fk_tickets_last_operator
    FOREIGN KEY (last_operator_id) REFERENCES users(id);
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS chk_ticket_cycle_number;
ALTER TABLE tickets ADD CONSTRAINT chk_ticket_cycle_number CHECK (current_cycle_number > 0);

CREATE TABLE IF NOT EXISTS ticket_cycles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    cycle_number integer NOT NULL CHECK (cycle_number > 0),
    sla_policy_id uuid NOT NULL REFERENCES company_sla_policies(id),
    schedule_version_id uuid NOT NULL REFERENCES company_schedule_versions(id),
    escalation_level escalation_level NOT NULL,
    started_at timestamptz NOT NULL,
    escalated_at timestamptz,
    first_response_at timestamptz,
    closed_at timestamptz,
    closed_by_user_id uuid REFERENCES users(id),
    last_operator_id uuid REFERENCES users(id),
    CONSTRAINT uq_ticket_cycle UNIQUE (ticket_id, cycle_number)
);
INSERT INTO ticket_cycles (
    ticket_id, cycle_number, sla_policy_id, schedule_version_id,
    escalation_level, started_at, escalated_at, first_response_at, closed_at,
    closed_by_user_id, last_operator_id
)
SELECT id, current_cycle_number, sla_policy_id, schedule_version_id,
       escalation_level, created_at, escalated_at, first_response_at, closed_at,
       closed_by_user_id, last_operator_id
FROM tickets
ON CONFLICT (ticket_id, cycle_number) DO NOTHING;

-- Stable idempotent results are scoped by tenant and operation.
CREATE TABLE IF NOT EXISTS idempotency_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    operation varchar(100) NOT NULL,
    key varchar(255) NOT NULL,
    request_hash varchar(64) NOT NULL,
    response_status integer NOT NULL CHECK (response_status BETWEEN 100 AND 599),
    response_body jsonb NOT NULL,
    resource_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz,
    CONSTRAINT uq_idempotency_scope UNIQUE (company_id, operation, key)
);

-- A Telegram message is unique only within its ticket. Operator attachments do
-- not have a Telegram file id and Telegram ids may be reused across messages.
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM ticket_messages
        WHERE sender_type = 'client' AND telegram_message_id IS NOT NULL
        GROUP BY ticket_id, telegram_message_id HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'API-02 conflict: duplicate client Telegram messages';
    END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_client_telegram_message
    ON ticket_messages(ticket_id, telegram_message_id)
    WHERE sender_type = 'client' AND telegram_message_id IS NOT NULL;
DROP INDEX IF EXISTS idx_message_attachments_telegram_file_id;
DROP INDEX IF EXISTS uni_message_attachments_telegram_file_id;
ALTER TABLE message_attachments ALTER COLUMN telegram_file_id DROP NOT NULL;

-- Delivery has an explicit pending state and records terminal failures.
ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS delivery_status message_delivery_status NOT NULL DEFAULT 'pending';
ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS delivery_error text;
ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS delivery_updated_at timestamptz;
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'ticket_messages' AND column_name = 'is_delivered'
    ) THEN
        UPDATE ticket_messages
        SET delivery_status = CASE WHEN is_delivered THEN 'delivered'::message_delivery_status ELSE 'failed'::message_delivery_status END,
            delivery_updated_at = COALESCE(delivery_updated_at, created_at);
    END IF;
END $$;
ALTER TABLE ticket_messages DROP COLUMN IF EXISTS is_delivered;

DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'ticket_sla_metrics' AND column_name = 'last_calculated_at'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'ticket_sla_metrics' AND column_name = 'calculated_at'
    ) THEN
        ALTER TABLE ticket_sla_metrics RENAME COLUMN last_calculated_at TO calculated_at;
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'ticket_sla_metrics' AND column_name = 'last_calculated_at'
    ) THEN
        UPDATE ticket_sla_metrics SET calculated_at = COALESCE(calculated_at, last_calculated_at);
        ALTER TABLE ticket_sla_metrics DROP COLUMN last_calculated_at;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM tickets
        WHERE assigned_operator_id IS NOT NULL AND status IN ('in_progress', 'waiting_client')
        GROUP BY assigned_operator_id HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'API-02 conflict: operator has multiple assigned open tickets';
    END IF;
END $$;
DROP INDEX IF EXISTS idx_uq_active_ticket_per_operator;
CREATE UNIQUE INDEX idx_uq_active_ticket_per_operator
    ON tickets(assigned_operator_id)
    WHERE status IN ('in_progress', 'waiting_client') AND assigned_operator_id IS NOT NULL;

-- One durable row is one target-specific event. Aggregate sequence allocation
-- is serialized by outbox_sequences, preserving commit order for a ticket.
CREATE TABLE IF NOT EXISTS outbox_sequences (
    aggregate_type varchar(50) NOT NULL,
    aggregate_id uuid NOT NULL,
    next_sequence bigint NOT NULL CHECK (next_sequence > 0),
    PRIMARY KEY (aggregate_type, aggregate_id)
);
CREATE TABLE IF NOT EXISTS outbox_events (
    id uuid PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    aggregate_type varchar(50) NOT NULL,
    aggregate_id uuid NOT NULL,
    sequence bigint NOT NULL CHECK (sequence > 0),
    event_type varchar(100) NOT NULL,
    schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version > 0),
    routing_key varchar(255) NOT NULL,
    correlation_id uuid NOT NULL,
    payload jsonb NOT NULL,
    occurred_at timestamptz NOT NULL,
    available_at timestamptz NOT NULL DEFAULT now(),
    attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    locked_by uuid,
    locked_until timestamptz,
    published_at timestamptz,
    failed_at timestamptz,
    last_error varchar(1000),
    CONSTRAINT uq_outbox_aggregate_sequence UNIQUE (aggregate_type, aggregate_id, sequence)
);
CREATE INDEX IF NOT EXISTS idx_outbox_pending
    ON outbox_events(available_at, occurred_at, id)
    WHERE published_at IS NULL AND failed_at IS NULL;

-- Tenant roles are denied when app.current_company_id is absent. The separate
-- analytics background role is the narrow, explicit RLS bypass used by global
-- recalculation jobs.
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'support_api_svc') THEN
        CREATE ROLE support_api_svc NOLOGIN NOBYPASSRLS;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'analytics_svc') THEN
        CREATE ROLE analytics_svc NOLOGIN NOBYPASSRLS;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'analytics_background_svc') THEN
        CREATE ROLE analytics_background_svc NOLOGIN BYPASSRLS;
    END IF;
END $$;
ALTER ROLE support_api_svc NOBYPASSRLS;
ALTER ROLE analytics_svc NOBYPASSRLS;
ALTER ROLE analytics_background_svc BYPASSRLS;
GRANT analytics_svc TO analytics_background_svc;
DO $$ BEGIN
    EXECUTE format('GRANT support_api_svc TO %I', current_user);
END $$;
CREATE SCHEMA IF NOT EXISTS analytics AUTHORIZATION analytics_svc;
DO $$ BEGIN
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO support_api_svc, analytics_svc, analytics_background_svc', current_schema());
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA %I TO support_api_svc', current_schema());
    EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA %I TO support_api_svc', current_schema());
END $$;
REVOKE ALL ON schema_migrations FROM support_api_svc;

REVOKE ALL ON users, bot_configs, message_attachments, ticket_messages,
    tickets, ticket_status_history, ticket_ratings, ticket_sla_metrics,
    company_sla_policies, company_schedules, company_schedule_versions,
    ticket_cycles FROM analytics_svc;
GRANT SELECT (id, company_id, full_name, role, is_blocked) ON users TO analytics_svc;
GRANT SELECT (id, company_id, assigned_operator_id, sla_policy_id, schedule_version_id,
    current_cycle_number, status, escalation_level, escalated_at, first_response_at,
    closed_at, closed_by_user_id, last_operator_id, created_at, updated_at)
    ON tickets TO analytics_svc;
GRANT SELECT (id, ticket_id, old_status, new_status, changed_by_user_id, trigger_type, created_at)
    ON ticket_status_history TO analytics_svc;
GRANT SELECT (id, ticket_id, sender_type, sender_user_id, delivery_status, created_at)
    ON ticket_messages TO analytics_svc;
GRANT SELECT (ticket_id, score, rated_at) ON ticket_ratings TO analytics_svc;
GRANT SELECT ON company_sla_policies, company_schedules, company_schedule_versions, ticket_cycles TO analytics_svc;
GRANT SELECT, INSERT, UPDATE ON ticket_sla_metrics TO analytics_svc;

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON companies;
CREATE POLICY tenant_isolation ON companies USING (id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE bot_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_schedule_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_sla_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON bot_configs;
CREATE POLICY tenant_isolation ON bot_configs USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);
DROP POLICY IF EXISTS tenant_isolation ON company_schedules;
CREATE POLICY tenant_isolation ON company_schedules USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);
DROP POLICY IF EXISTS tenant_isolation ON company_schedule_versions;
CREATE POLICY tenant_isolation ON company_schedule_versions USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);
DROP POLICY IF EXISTS tenant_isolation ON company_sla_policies;
CREATE POLICY tenant_isolation ON company_sla_policies USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);
DROP POLICY IF EXISTS tenant_isolation ON company_faqs;
CREATE POLICY tenant_isolation ON company_faqs USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);
DROP POLICY IF EXISTS tenant_isolation ON users;
CREATE POLICY tenant_isolation ON users USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);
DROP POLICY IF EXISTS tenant_isolation ON company_invitations;
CREATE POLICY tenant_isolation ON company_invitations USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);
DROP POLICY IF EXISTS tenant_isolation ON clients;
CREATE POLICY tenant_isolation ON clients USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);
DROP POLICY IF EXISTS tenant_isolation ON tickets;
CREATE POLICY tenant_isolation ON tickets USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);
DROP POLICY IF EXISTS tenant_isolation ON idempotency_records;
CREATE POLICY tenant_isolation ON idempotency_records USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);
DROP POLICY IF EXISTS tenant_isolation ON broadcast_campaigns;
CREATE POLICY tenant_isolation ON broadcast_campaigns USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);
DROP POLICY IF EXISTS tenant_isolation ON audit_logs;
CREATE POLICY tenant_isolation ON audit_logs USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);
DROP POLICY IF EXISTS tenant_isolation ON outbox_events;
CREATE POLICY tenant_isolation ON outbox_events USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON user_sessions;
CREATE POLICY tenant_isolation ON user_sessions USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = user_sessions.user_id
      AND u.company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid
));
ALTER TABLE operator_connection_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON operator_connection_codes;
CREATE POLICY tenant_isolation ON operator_connection_codes USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = operator_connection_codes.operator_id
      AND u.company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid
));
ALTER TABLE ticket_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_sla_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON ticket_status_history;
CREATE POLICY tenant_isolation ON ticket_status_history USING (EXISTS (
    SELECT 1 FROM tickets t WHERE t.id = ticket_status_history.ticket_id
      AND t.company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid
));
DROP POLICY IF EXISTS tenant_isolation ON ticket_messages;
CREATE POLICY tenant_isolation ON ticket_messages USING (EXISTS (
    SELECT 1 FROM tickets t WHERE t.id = ticket_messages.ticket_id
      AND t.company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid
));
DROP POLICY IF EXISTS tenant_isolation ON ticket_cycles;
CREATE POLICY tenant_isolation ON ticket_cycles USING (EXISTS (
    SELECT 1 FROM tickets t WHERE t.id = ticket_cycles.ticket_id
      AND t.company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid
));
DROP POLICY IF EXISTS tenant_isolation ON ticket_ratings;
CREATE POLICY tenant_isolation ON ticket_ratings USING (EXISTS (
    SELECT 1 FROM tickets t WHERE t.id = ticket_ratings.ticket_id
      AND t.company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid
));
DROP POLICY IF EXISTS tenant_isolation ON ticket_sla_metrics;
CREATE POLICY tenant_isolation ON ticket_sla_metrics USING (EXISTS (
    SELECT 1 FROM tickets t WHERE t.id = ticket_sla_metrics.ticket_id
      AND t.company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid
));
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON message_attachments;
CREATE POLICY tenant_isolation ON message_attachments USING (EXISTS (
    SELECT 1 FROM ticket_messages m JOIN tickets t ON t.id = m.ticket_id
    WHERE m.id = message_attachments.message_id
      AND t.company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid
));
