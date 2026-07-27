CREATE TABLE IF NOT EXISTS admin_access_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_date date NOT NULL,
  review_scope text NOT NULL CHECK (review_scope IN ('all-admins','succession-related','emergency-accounts')),
  active_admin_count integer NOT NULL DEFAULT 0 CHECK (active_admin_count >= 0),
  inactive_account_count integer NOT NULL DEFAULT 0 CHECK (inactive_account_count >= 0),
  excessive_permission_count integer NOT NULL DEFAULT 0 CHECK (excessive_permission_count >= 0),
  findings text NOT NULL DEFAULT '',
  corrective_action text NOT NULL DEFAULT '',
  next_review_date date,
  reviewed_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS emergency_admin_recovery_drills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drill_date date NOT NULL,
  drill_type text NOT NULL CHECK (drill_type IN ('credential-check','login-drill','full-recovery')),
  emergency_account_verified boolean NOT NULL DEFAULT false,
  mfa_verified boolean NOT NULL DEFAULT false,
  audit_log_verified boolean NOT NULL DEFAULT false,
  backup_contact_verified boolean NOT NULL DEFAULT false,
  result text NOT NULL CHECK (result IN ('passed','conditional','failed')),
  issue_summary text NOT NULL DEFAULT '',
  corrective_action text NOT NULL DEFAULT '',
  next_drill_date date,
  performed_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_access_reviews_created_at ON admin_access_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emergency_admin_recovery_drills_created_at ON emergency_admin_recovery_drills(created_at DESC);
