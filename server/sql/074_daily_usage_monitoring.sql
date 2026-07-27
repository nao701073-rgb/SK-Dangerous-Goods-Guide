-- Part 223: daily usage monitoring
CREATE TABLE IF NOT EXISTS daily_usage_report_exports (
  id bigserial PRIMARY KEY,
  report_date date NOT NULL,
  generated_by uuid NOT NULL REFERENCES users(id),
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_daily_usage_report_date ON daily_usage_report_exports(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_daily ON user_activity_events((occurred_at::date),user_id);
