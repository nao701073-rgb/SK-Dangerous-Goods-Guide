-- Part 199: Administrator succession workflow limited to the Safety and Environment Office Director.
CREATE TABLE IF NOT EXISTS admin_succession_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by uuid NOT NULL REFERENCES users(id),
  target_user_id uuid NOT NULL REFERENCES users(id),
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('approved','scheduled','executed','rolled-back','cancelled')),
  checks jsonb NOT NULL DEFAULT '{}'::jsonb,
  approver_name text NOT NULL,
  approver_title text NOT NULL,
  approval_date date NOT NULL,
  scheduled_at timestamptz,
  executed_at timestamptz,
  executed_by uuid REFERENCES users(id),
  former_admin_id uuid REFERENCES users(id),
  support_until timestamptz,
  rollback_until timestamptz,
  rolled_back_at timestamptz,
  rolled_back_by uuid REFERENCES users(id),
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_succession_open_request
  ON admin_succession_requests((1))
  WHERE status IN ('approved','scheduled','executed');
CREATE INDEX IF NOT EXISTS idx_admin_succession_target_status
  ON admin_succession_requests(target_user_id,status,created_at DESC);
