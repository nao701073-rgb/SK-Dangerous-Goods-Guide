CREATE TABLE IF NOT EXISTS deployment_execution_records (
  id BIGSERIAL PRIMARY KEY,
  environment_name TEXT NOT NULL,
  target_version TEXT NOT NULL,
  switch_at TIMESTAMPTZ,
  owner_name TEXT,
  decision TEXT NOT NULL DEFAULT 'pending' CHECK (decision IN ('pending','go','rollback','completed')),
  phase_results JSONB NOT NULL DEFAULT '{}'::jsonb,
  post_launch_results JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  created_by BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deployment_execution_records_switch_at ON deployment_execution_records(switch_at DESC);
CREATE INDEX IF NOT EXISTS idx_deployment_execution_records_decision ON deployment_execution_records(decision);
