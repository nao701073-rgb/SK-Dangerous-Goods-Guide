CREATE TABLE IF NOT EXISTS admin_operation_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
  audience text NOT NULL DEFAULT 'administrators' CHECK (audience IN ('all-users','office-admins','safety-environment','administrators')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_recurring_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type text NOT NULL CHECK (task_type IN ('access-review','recovery-drill','backup-check','user-review','regulation-review','other')),
  title text NOT NULL,
  owner_role text NOT NULL DEFAULT 'safety-environment-admin',
  due_date date NOT NULL,
  recurrence text NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none','monthly','quarterly','semiannual','annual')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','completed','cancelled')),
  completion_note text NOT NULL DEFAULT '',
  completed_at timestamptz,
  completed_by uuid REFERENCES users(id),
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_governance_report_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_period text NOT NULL,
  report_data jsonb NOT NULL,
  generated_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_operation_notices_active ON admin_operation_notices(active,starts_at,ends_at);
CREATE INDEX IF NOT EXISTS idx_admin_recurring_tasks_due ON admin_recurring_tasks(status,due_date);
CREATE INDEX IF NOT EXISTS idx_admin_governance_report_period ON admin_governance_report_snapshots(report_period,created_at DESC);
