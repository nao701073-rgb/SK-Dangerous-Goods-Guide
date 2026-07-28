-- Part 250: post-deployment stabilization and handoff records
CREATE TABLE IF NOT EXISTS post_deployment_operations_reviews (
  id BIGSERIAL PRIMARY KEY,
  environment_name TEXT NOT NULL,
  target_version TEXT NOT NULL,
  launch_date DATE,
  owner_name TEXT,
  inquiry_count INTEGER NOT NULL DEFAULT 0 CHECK (inquiry_count >= 0),
  open_incident_count INTEGER NOT NULL DEFAULT 0 CHECK (open_incident_count >= 0),
  critical_incident_count INTEGER NOT NULL DEFAULT 0 CHECK (critical_incident_count >= 0),
  support_notes TEXT,
  decision TEXT NOT NULL DEFAULT 'pending' CHECK (decision IN ('pending','stable','handoff-ready','handoff-completed')),
  summary TEXT,
  stabilization_checks JSONB NOT NULL DEFAULT '{}'::jsonb,
  handoff_checks JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_post_deployment_operations_reviews_launch_date
  ON post_deployment_operations_reviews (launch_date DESC);
CREATE INDEX IF NOT EXISTS idx_post_deployment_operations_reviews_decision
  ON post_deployment_operations_reviews (decision);
