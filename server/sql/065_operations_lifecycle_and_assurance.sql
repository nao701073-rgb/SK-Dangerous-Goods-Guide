BEGIN;
CREATE TABLE IF NOT EXISTS user_lifecycle_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  action_type text NOT NULL CHECK(action_type IN ('join','transfer','role-change','suspend','reactivate','retire')),
  effective_date date NOT NULL,
  old_role text,
  new_role text,
  old_office_id uuid REFERENCES offices(id),
  new_office_id uuid REFERENCES offices(id),
  reason text,
  status text NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','completed','cancelled')),
  completed_at timestamptz,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_lifecycle_actions_due ON user_lifecycle_actions(status,effective_date);

CREATE TABLE IF NOT EXISTS operational_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_no text NOT NULL UNIQUE,
  severity text NOT NULL CHECK(severity IN ('low','medium','high','critical')),
  category text NOT NULL,
  title text NOT NULL,
  description text,
  affected_scope text,
  status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','investigating','contained','resolved','closed')),
  occurred_at timestamptz NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  root_cause text,
  corrective_action text,
  owner_id uuid REFERENCES users(id),
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_operational_incidents_status ON operational_incidents(status,severity,occurred_at DESC);

CREATE TABLE IF NOT EXISTS service_metric_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL UNIQUE,
  active_users integer NOT NULL DEFAULT 0,
  login_success_count integer NOT NULL DEFAULT 0,
  login_failure_count integer NOT NULL DEFAULT 0,
  locked_user_count integer NOT NULL DEFAULT 0,
  open_incident_count integer NOT NULL DEFAULT 0,
  overdue_task_count integer NOT NULL DEFAULT 0,
  backup_verified boolean NOT NULL DEFAULT false,
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS restore_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_date date NOT NULL,
  target_type text NOT NULL CHECK(target_type IN ('database','photos','full-system')),
  result text NOT NULL CHECK(result IN ('passed','partial','failed')),
  recovery_time_minutes integer CHECK(recovery_time_minutes >= 0),
  recovery_point_minutes integer CHECK(recovery_point_minutes >= 0),
  evidence text,
  issues text,
  corrective_action text,
  conducted_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_restore_exercises_date ON restore_exercises(exercise_date DESC);
COMMIT;
