DO $$ BEGIN ALTER TYPE audit_action_type ADD VALUE IF NOT EXISTS 'user_registered'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE audit_action_type ADD VALUE IF NOT EXISTS 'profile_updated'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE audit_action_type ADD VALUE IF NOT EXISTS 'company_created'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_count integer NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_window_started_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_locked_until timestamptz;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM users GROUP BY lower(btrim(login)) HAVING count(*) > 1) THEN
        RAISE EXCEPTION 'API-03 conflict: normalized logins are not unique';
    END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_login_normalized ON users (lower(btrim(login)));

ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS last_activity_at timestamptz;
UPDATE user_sessions SET last_activity_at = created_at WHERE last_activity_at IS NULL;
ALTER TABLE user_sessions ALTER COLUMN last_activity_at SET NOT NULL;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS revoked_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sessions_refresh_hash ON user_sessions(refresh_token_hash);

ALTER TABLE operator_connection_codes ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE operator_connection_codes ADD COLUMN IF NOT EXISTS used_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS idx_connection_codes_code ON operator_connection_codes(code);
CREATE INDEX IF NOT EXISTS idx_connection_codes_operator_active ON operator_connection_codes(operator_id, is_used, expires_at);

ALTER TABLE company_invitations ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE company_invitations ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE company_invitations ADD COLUMN IF NOT EXISTS decided_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_pending ON company_invitations(company_id, operator_id) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS connection_code_attempts (
    admin_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    window_started_at timestamptz NOT NULL,
    failure_count integer NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
    locked_until timestamptz
);

-- Authentication/onboarding needs controlled cross-tenant lookup before a
-- company is known. The dedicated NOLOGIN role has access only to API-03
-- tables; it does not bypass RLS or gain access to tickets/messages.
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'auth_api_svc') THEN
        CREATE ROLE auth_api_svc NOLOGIN NOBYPASSRLS;
    END IF;
END $$;
ALTER ROLE auth_api_svc NOBYPASSRLS;
DO $$ BEGIN EXECUTE format('GRANT auth_api_svc TO %I', current_user); END $$;
DO $$ BEGIN
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO auth_api_svc', current_schema());
    EXECUTE format('GRANT SELECT, INSERT, UPDATE ON TABLE %I.users, %I.user_sessions, %I.operator_connection_codes, %I.company_invitations, %I.companies, %I.company_schedules, %I.company_sla_policies, %I.audit_logs, %I.connection_code_attempts TO auth_api_svc', current_schema(), current_schema(), current_schema(), current_schema(), current_schema(), current_schema(), current_schema(), current_schema(), current_schema());
    EXECUTE format('GRANT DELETE ON TABLE %I.connection_code_attempts TO auth_api_svc', current_schema());
END $$;

DROP POLICY IF EXISTS auth_access ON users;
CREATE POLICY auth_access ON users FOR ALL TO auth_api_svc USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS auth_access ON user_sessions;
CREATE POLICY auth_access ON user_sessions FOR ALL TO auth_api_svc USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS auth_access ON operator_connection_codes;
CREATE POLICY auth_access ON operator_connection_codes FOR ALL TO auth_api_svc USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS auth_access ON company_invitations;
CREATE POLICY auth_access ON company_invitations FOR ALL TO auth_api_svc USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS auth_access ON companies;
CREATE POLICY auth_access ON companies FOR ALL TO auth_api_svc USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS auth_access ON company_schedules;
CREATE POLICY auth_access ON company_schedules FOR ALL TO auth_api_svc USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS auth_access ON company_sla_policies;
CREATE POLICY auth_access ON company_sla_policies FOR ALL TO auth_api_svc USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS auth_access ON audit_logs;
CREATE POLICY auth_access ON audit_logs FOR ALL TO auth_api_svc USING (true) WITH CHECK (true);
ALTER TABLE connection_code_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auth_access ON connection_code_attempts;
CREATE POLICY auth_access ON connection_code_attempts FOR ALL TO auth_api_svc USING (true) WITH CHECK (true);
