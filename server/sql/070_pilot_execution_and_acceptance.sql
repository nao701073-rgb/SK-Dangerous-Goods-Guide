-- Part 215 pilot execution, invitation tracking and acceptance decision
CREATE TABLE IF NOT EXISTS pilot_invitation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES pilot_launch_batches(id) ON DELETE SET NULL,
  target_role text,
  target_count integer NOT NULL DEFAULT 0 CHECK (target_count >= 0),
  sent_count integer NOT NULL DEFAULT 0 CHECK (sent_count >= 0),
  delivered_count integer NOT NULL DEFAULT 0 CHECK (delivered_count >= 0),
  failed_count integer NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  expired_count integer NOT NULL DEFAULT 0 CHECK (expired_count >= 0),
  evidence text,
  executed_by uuid REFERENCES users(id),
  executed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pilot_user_progress_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES pilot_launch_batches(id) ON DELETE SET NULL,
  total_users integer NOT NULL DEFAULT 0,
  invited_users integer NOT NULL DEFAULT 0,
  first_login_completed integer NOT NULL DEFAULT 0,
  password_changed integer NOT NULL DEFAULT 0,
  mfa_completed integer NOT NULL DEFAULT 0,
  permission_verified integer NOT NULL DEFAULT 0,
  locked_users integer NOT NULL DEFAULT 0,
  support_required integer NOT NULL DEFAULT 0,
  notes text,
  captured_by uuid REFERENCES users(id),
  captured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pilot_acceptance_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES pilot_launch_batches(id) ON DELETE SET NULL,
  decision text NOT NULL CHECK (decision IN ('hold','continue-pilot','expand-150','ready-for-production')),
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  open_issue_count integer NOT NULL DEFAULT 0,
  decision_reason text,
  next_review_date date,
  decided_by uuid REFERENCES users(id),
  decided_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pilot_invitation_runs_batch_date ON pilot_invitation_runs(batch_id,executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_pilot_progress_batch_date ON pilot_user_progress_snapshots(batch_id,captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_pilot_acceptance_batch_date ON pilot_acceptance_decisions(batch_id,decided_at DESC);
