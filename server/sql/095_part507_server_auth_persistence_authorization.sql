-- Part 507 / 正式運用準備 第1段階
-- サーバー側認証・保存・権限制御

CREATE TABLE IF NOT EXISTS auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  csrf_hash text NOT NULL,
  token_version integer NOT NULL DEFAULT 1,
  remember_me boolean NOT NULL DEFAULT false,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  idle_expires_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revoked_reason text
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_active
  ON auth_sessions(user_id, expires_at DESC)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expiry
  ON auth_sessions(expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS role_permissions (
  role text NOT NULL,
  permission text NOT NULL,
  allowed boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(role, permission)
);

INSERT INTO role_permissions(role,permission,allowed) VALUES
  ('office-user','operational.read',true),
  ('office-user','operational.write',true),
  ('office-user','operational.delete',true),
  ('office-admin','operational.read',true),
  ('office-admin','operational.write',true),
  ('office-admin','operational.delete',true),
  ('office-admin','office.users.manage',true),
  ('safety-environment-director','operational.read',true),
  ('safety-environment-director','operational.write',true),
  ('safety-environment-staff','operational.read',true),
  ('safety-environment-admin','operational.read',true),
  ('safety-environment-admin','operational.write',true),
  ('safety-environment-admin','operational.delete',true),
  ('safety-environment-admin','system.admin',true),
  ('validator','validation.read',true),
  ('validator','validation.execute',true),
  ('revision-validator','validation.read',true),
  ('revision-validator','validation.execute',true)
ON CONFLICT(role,permission) DO UPDATE SET allowed=excluded.allowed,updated_at=now();

CREATE TABLE IF NOT EXISTS production_security_checks (
  check_key text PRIMARY KEY,
  status text NOT NULL CHECK(status IN ('not-checked','passed','warning','failed','not-applicable')),
  summary text NOT NULL DEFAULT '',
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  checked_by uuid REFERENCES users(id),
  checked_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO production_security_checks(check_key,status,summary) VALUES
 ('database-connection','not-checked','PostgreSQLへの接続と書込みを確認します。'),
 ('persistent-storage','not-checked','添付資料・写真の永続保存領域を確認します。'),
 ('server-session','not-checked','HttpOnly Cookieによるサーバーセッションを確認します。'),
 ('csrf-protection','not-checked','更新系APIのCSRF対策を確認します。'),
 ('office-scope','not-checked','所属事業所によるデータ分離を確認します。'),
 ('role-permissions','not-checked','役割別権限をサーバー側で確認します。'),
 ('https-enforcement','not-checked','本番環境でHTTPSを強制していることを確認します。')
ON CONFLICT(check_key) DO NOTHING;
