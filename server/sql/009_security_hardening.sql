-- Part 97: security hardening
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version integer NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_forced_logout_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_required boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_audit_action_created ON audit_logs(action,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user_created ON audit_logs(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_office_created ON audit_logs(office_id,created_at DESC);
