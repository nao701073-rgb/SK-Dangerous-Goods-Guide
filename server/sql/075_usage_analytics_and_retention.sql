-- Part 224: usage analytics, response tracking and retention governance
CREATE TABLE IF NOT EXISTS activity_alert_cases (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  rule_code text NOT NULL CHECK (rule_code IN ('bulk-dangerous-goods','bulk-regulations','bulk-applications','bulk-photos','other')),
  period_label text,
  summary text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','dismissed')),
  resolution_note text,
  created_by uuid NOT NULL REFERENCES users(id),
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_alert_cases_user ON activity_alert_cases(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_alert_cases_status ON activity_alert_cases(status,created_at DESC);

CREATE TABLE IF NOT EXISTS activity_retention_policy (
  id smallint PRIMARY KEY CHECK (id=1),
  event_retention_days integer NOT NULL DEFAULT 365 CHECK (event_retention_days BETWEEN 30 AND 3650),
  report_retention_days integer NOT NULL DEFAULT 1095 CHECK (report_retention_days BETWEEN 365 AND 3650),
  next_review_date date,
  note text,
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO activity_retention_policy(id) VALUES(1) ON CONFLICT(id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_user_activity_period_feature ON user_activity_events(occurred_at,feature,user_id);
