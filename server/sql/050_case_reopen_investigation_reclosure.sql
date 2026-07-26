-- Part 143: reopened case investigation, additional corrective action and reclosure
CREATE TABLE IF NOT EXISTS case_reopen_investigations (
  id text PRIMARY KEY,
  reopen_request_id text NOT NULL,
  previous_closure_certificate_id text NOT NULL,
  corrective_action_id text NOT NULL,
  office_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('investigating','pending-review','corrective-in-progress','pending-corrective-verification','reevaluation-pending','pending-reclosure','reclosed','cancelled')),
  scope text NOT NULL,
  assigned_to text NOT NULL,
  due_at timestamptz,
  progress integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  findings text,
  root_cause text,
  additional_action text,
  submitted_by text,
  submitted_at timestamptz,
  reviewed_by text,
  reviewed_at timestamptz,
  corrective_completed_by text,
  corrective_completed_at timestamptz,
  corrective_verified_by text,
  corrective_verified_at timestamptz,
  reevaluation_result text,
  reevaluated_by text,
  reevaluated_at timestamptz,
  reclosed_by text,
  reclosed_at timestamptz,
  reclosure_certificate_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS case_reopen_investigation_events (
  id bigserial PRIMARY KEY,
  investigation_id text NOT NULL REFERENCES case_reopen_investigations(id),
  event_type text NOT NULL,
  actor text NOT NULL,
  note text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_reopen_investigations_status_due ON case_reopen_investigations(status, due_at);
CREATE INDEX IF NOT EXISTS idx_case_reopen_investigations_office ON case_reopen_investigations(office_id, created_at DESC);
