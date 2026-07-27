-- Part 229: activity audit operations and controlled retention workflow
ALTER TABLE activity_alert_cases
  ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS due_at timestamptz,
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_activity_alert_cases_due
  ON activity_alert_cases(status,due_at) WHERE status IN ('open','reviewing');

CREATE TABLE IF NOT EXISTS activity_retention_disposal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_cutoff date NOT NULL,
  report_cutoff date NOT NULL,
  event_count bigint NOT NULL DEFAULT 0,
  review_count bigint NOT NULL DEFAULT 0,
  alert_case_count bigint NOT NULL DEFAULT 0,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','executed','cancelled')),
  requested_by uuid NOT NULL REFERENCES users(id),
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_by uuid REFERENCES users(id),
  decided_at timestamptz,
  decision_note text,
  executed_at timestamptz,
  execution_note text
);
CREATE INDEX IF NOT EXISTS idx_activity_retention_disposal_status
  ON activity_retention_disposal_requests(status,requested_at DESC);

CREATE TABLE IF NOT EXISTS activity_report_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES activity_report_schedules(id),
  period_type text NOT NULL CHECK(period_type IN ('weekly','monthly')),
  period_from date NOT NULL,
  period_to date NOT NULL,
  report_scope text NOT NULL,
  report_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'generated' CHECK(status IN ('generated','reviewed','approved','failed')),
  generated_by uuid NOT NULL REFERENCES users(id),
  generated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  review_note text
);
CREATE INDEX IF NOT EXISTS idx_activity_report_runs_period
  ON activity_report_runs(period_from DESC,period_type);
