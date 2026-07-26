ALTER TABLE users ADD COLUMN IF NOT EXISTS login_id text;
UPDATE users
SET login_id = lower(regexp_replace(split_part(email,'@',1),'[^a-zA-Z0-9._-]','','g')) || '-' || substr(id::text,1,8)
WHERE login_id IS NULL OR login_id='';
ALTER TABLE users ALTER COLUMN login_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_login_id_lower ON users(lower(login_id));

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_required boolean NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_category text NOT NULL DEFAULT 'inspector';
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS activated_at timestamptz;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN (
  'office-user','office-admin','safety-environment-admin','guest','validator'
));
ALTER TABLE users ADD CONSTRAINT users_office_role_check CHECK (
  role IN ('safety-environment-admin','guest','validator') OR office_id IS NOT NULL
);
ALTER TABLE users ADD CONSTRAINT users_account_category_check CHECK (
  account_category IN ('inspector','staff-guest','staff-validator','safety-environment')
);

CREATE TABLE IF NOT EXISTS mfa_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose text NOT NULL DEFAULT 'login' CHECK (purpose IN ('login','password-reset','activation')),
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mfa_user_created ON mfa_challenges(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mfa_expiry ON mfa_challenges(expires_at) WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS account_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL,
  token_type text NOT NULL CHECK (token_type IN ('activation','password-reset')),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_account_tokens_user ON account_tokens(user_id,token_type,created_at DESC);

CREATE TABLE IF NOT EXISTS pilot_sites (
  office_id text PRIMARY KEY REFERENCES offices(id),
  pilot_name text NOT NULL,
  status text NOT NULL DEFAULT '準備中' CHECK (status IN ('準備中','試験運用中','評価中','完了','中止')),
  start_date date,
  end_date date,
  coordinator_name text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO pilot_sites(office_id,pilot_name,status,coordinator_name,notes)
VALUES('office-kawasaki','川崎事業所 試験運用','準備中','','第一ブロックでの先行試験運用拠点')
ON CONFLICT(office_id) DO NOTHING;
