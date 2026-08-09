BEGIN;

CREATE TABLE IF NOT EXISTS operational_on_call_rosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  timezone text NOT NULL DEFAULT 'Asia/Tokyo',
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS operational_on_call_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roster_id uuid NOT NULL REFERENCES operational_on_call_rosters(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  primary_user_id uuid NOT NULL REFERENCES users(id),
  backup_user_id uuid REFERENCES users(id),
  handover_note text NOT NULL DEFAULT '',
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES users(id),
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT operational_on_call_shift_period CHECK (ends_at > starts_at),
  CONSTRAINT operational_on_call_distinct_users CHECK (backup_user_id IS NULL OR backup_user_id <> primary_user_id)
);
CREATE INDEX IF NOT EXISTS idx_operational_on_call_shifts_window ON operational_on_call_shifts(starts_at,ends_at);

CREATE TABLE IF NOT EXISTS operational_escalation_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('critical','high','medium','low')),
  acknowledgement_minutes integer NOT NULL CHECK (acknowledgement_minutes > 0),
  resolution_minutes integer NOT NULL CHECK (resolution_minutes >= acknowledgement_minutes),
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS operational_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_key text NOT NULL UNIQUE,
  source text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  severity text NOT NULL CHECK (severity IN ('critical','high','medium','low')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','investigating','monitoring','resolved','closed','cancelled')),
  detected_at timestamptz NOT NULL,
  acknowledgement_due_at timestamptz NOT NULL,
  resolution_due_at timestamptz NOT NULL,
  escalation_level integer NOT NULL DEFAULT 0 CHECK (escalation_level >= 0),
  assigned_user_id uuid REFERENCES users(id),
  assigned_roster_id uuid REFERENCES operational_on_call_rosters(id),
  evidence_sha256 text CHECK (evidence_sha256 IS NULL OR evidence_sha256 ~ '^[a-f0-9]{64}$'),
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES users(id),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES users(id),
  resolution text NOT NULL DEFAULT '',
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_operational_alerts_active ON operational_alerts(status,severity,resolution_due_at);

CREATE TABLE IF NOT EXISTS operational_alert_events (
  id bigserial PRIMARY KEY,
  alert_id uuid NOT NULL REFERENCES operational_alerts(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  level integer NOT NULL DEFAULT 0,
  note text NOT NULL DEFAULT '',
  actor_id uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS operational_service_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  metric_type text NOT NULL CHECK (metric_type IN ('availability','success-rate','latency','delivery-rate','recovery-rate')),
  target_percent numeric(8,5) NOT NULL CHECK (target_percent > 0 AND target_percent <= 100),
  window_days integer NOT NULL DEFAULT 30 CHECK (window_days BETWEEN 1 AND 366),
  critical boolean NOT NULL DEFAULT false,
  owner_user_id uuid REFERENCES users(id),
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS operational_slo_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id uuid NOT NULL REFERENCES operational_service_objectives(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  numerator numeric(20,5) NOT NULL,
  denominator numeric(20,5) NOT NULL CHECK (denominator > 0),
  actual_percent numeric(8,5) NOT NULL,
  status text NOT NULL CHECK (status IN ('met','missed')),
  error_budget_remaining numeric(20,5) NOT NULL,
  evidence_note text NOT NULL DEFAULT '',
  evidence_sha256 text NOT NULL CHECK (evidence_sha256 ~ '^[a-f0-9]{64}$'),
  recorded_by uuid REFERENCES users(id),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT operational_slo_period CHECK (period_end >= period_start),
  UNIQUE(objective_id,period_start,period_end)
);

CREATE TABLE IF NOT EXISTS operational_capacity_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type text NOT NULL CHECK (resource_type IN ('database','storage','api','notifications','users','sessions')),
  unit text NOT NULL,
  current_value numeric(20,5) NOT NULL CHECK (current_value >= 0),
  warning_threshold numeric(20,5) NOT NULL CHECK (warning_threshold >= 0),
  critical_threshold numeric(20,5) NOT NULL CHECK (critical_threshold >= warning_threshold),
  forecast_value numeric(20,5) NOT NULL CHECK (forecast_value >= 0),
  forecast_at date NOT NULL,
  action_plan text NOT NULL,
  owner_user_id uuid NOT NULL REFERENCES users(id),
  due_at date NOT NULL,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in-progress','completed','cancelled')),
  completed_at timestamptz,
  completed_by uuid REFERENCES users(id),
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_operational_capacity_due ON operational_capacity_forecasts(status,due_at);

CREATE TABLE IF NOT EXISTS operational_management_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_type text NOT NULL CHECK (period_type IN ('weekly','monthly','quarterly')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','reviewed','approved','returned')),
  summary text NOT NULL,
  risks text NOT NULL,
  decisions text NOT NULL DEFAULT '',
  next_actions text NOT NULL,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  snapshot_sha256 text CHECK (snapshot_sha256 IS NULL OR snapshot_sha256 ~ '^[a-f0-9]{64}$'),
  created_by uuid NOT NULL REFERENCES users(id),
  submitted_at timestamptz,
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  review_note text NOT NULL DEFAULT '',
  approved_by uuid REFERENCES users(id),
  approved_at timestamptz,
  approval_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT operational_report_period CHECK (period_end >= period_start),
  CONSTRAINT operational_report_actor_separation CHECK (
    (reviewed_by IS NULL OR reviewed_by <> created_by) AND
    (approved_by IS NULL OR approved_by <> created_by) AND
    (approved_by IS NULL OR reviewed_by IS NULL OR approved_by <> reviewed_by)
  )
);

COMMIT;
