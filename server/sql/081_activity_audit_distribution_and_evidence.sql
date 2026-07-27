-- Part 231: approved audit report distribution and evidence management
CREATE TABLE IF NOT EXISTS activity_report_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_run_id uuid NOT NULL REFERENCES activity_report_runs(id) ON DELETE RESTRICT,
  distribution_method text NOT NULL CHECK(distribution_method IN ('secure-download','internal-email','meeting','other')),
  recipients text NOT NULL,
  purpose text NOT NULL,
  distributed_by uuid NOT NULL REFERENCES users(id),
  distributed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_report_distributions_run ON activity_report_distributions(report_run_id);
CREATE INDEX IF NOT EXISTS idx_activity_report_distributions_at ON activity_report_distributions(distributed_at DESC);
