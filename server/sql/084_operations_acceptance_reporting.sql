-- Part 235: period reports, immutable approvals and next-review planning
CREATE TABLE IF NOT EXISTS operations_acceptance_period_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_type text NOT NULL CHECK (period_type IN ('quarterly','annual')),
  period_year integer NOT NULL CHECK (period_year BETWEEN 2020 AND 2100),
  period_quarter integer CHECK (period_quarter BETWEEN 1 AND 4),
  period_from date NOT NULL,
  period_to date NOT NULL,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_by uuid REFERENCES users(id),
  generated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((period_type='quarterly' AND period_quarter IS NOT NULL) OR (period_type='annual' AND period_quarter IS NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_acceptance_period_report_unique
  ON operations_acceptance_period_reports(period_type, period_year, COALESCE(period_quarter,0));
CREATE INDEX IF NOT EXISTS idx_acceptance_period_report_date
  ON operations_acceptance_period_reports(period_from DESC, period_to DESC);
