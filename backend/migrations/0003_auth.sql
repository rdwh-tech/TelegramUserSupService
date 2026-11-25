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
