ALTER TABLE users ADD COLUMN IF NOT EXISTS first_login_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_expires_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS security_reviewed_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS security_reviewed_by uuid REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_last_verified_at timestamptz;

CREATE TABLE IF NOT EXISTS account_security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'account-created','first-login','login-success','login-failure','account-locked','account-unlocked',
    'password-change-required','password-changed','password-reset','mfa-required','mfa-disabled',
    'mfa-verified','account-enabled','account-disabled','force-logout','security-review'
  )),
  actor_user_id uuid REFERENCES users(id),
  ip_address inet,
  user_agent text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_security_events_user_created ON account_security_events(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_account_security_review ON users(active,security_reviewed_at);
CREATE INDEX IF NOT EXISTS idx_users_account_expiry ON users(account_expires_at) WHERE account_expires_at IS NOT NULL;
