-- Part 238: 改善計画の承認・変更・引継ぎ受領
CREATE TABLE IF NOT EXISTS operations_improvement_governance_events (
  id bigserial PRIMARY KEY,
  improvement_plan_id bigint REFERENCES operations_acceptance_improvement_plans(id) ON DELETE CASCADE,
  action_type varchar(40) NOT NULL CHECK (action_type IN ('approve','change-owner','change-due-date','accept-handoff','return')),
  previous_owner varchar(200),
  new_owner varchar(200),
  previous_due_date date,
  new_due_date date,
  note text NOT NULL,
  acted_by bigint REFERENCES users(id),
  acted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_improvement_governance_plan ON operations_improvement_governance_events(improvement_plan_id, acted_at DESC);

CREATE TABLE IF NOT EXISTS operations_improvement_progress_reports (
  id bigserial PRIMARY KEY,
  target_year integer NOT NULL,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  report_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_by bigint REFERENCES users(id),
  generated_at timestamptz NOT NULL DEFAULT now()
);
