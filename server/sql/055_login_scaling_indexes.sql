-- Part 190: 50 to 150 users login and user-admin scaling
CREATE INDEX IF NOT EXISTS idx_users_lower_login_id ON users (lower(login_id));
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users (role, active);
CREATE INDEX IF NOT EXISTS idx_users_office_role_active ON users (office_id, role, active);
CREATE INDEX IF NOT EXISTS idx_users_last_login_at ON users (last_login_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users (locked_until) WHERE locked_until IS NOT NULL;
