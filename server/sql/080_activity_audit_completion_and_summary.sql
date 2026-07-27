-- Part 230: audit completion, approved report workflow and monthly management summary
ALTER TABLE activity_report_runs
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending' CHECK(approval_status IN ('pending','approved','returned')),
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_note text;
ALTER TABLE activity_retention_disposal_requests
  ADD COLUMN IF NOT EXISTS executed_by uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS execution_reference text;
CREATE TABLE IF NOT EXISTS activity_monthly_management_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_month date NOT NULL UNIQUE,
  summary_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  conclusion text NOT NULL CHECK(conclusion IN ('normal','follow-up','action-required')),
  management_note text,
  generated_by uuid NOT NULL REFERENCES users(id),
  generated_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid REFERENCES users(id),
  approved_at timestamptz,
  approval_note text
);
CREATE INDEX IF NOT EXISTS idx_activity_monthly_summary_month ON activity_monthly_management_summaries(summary_month DESC);
