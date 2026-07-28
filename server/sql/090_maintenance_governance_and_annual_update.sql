-- Part 251: 継続保守・年度更新管理
CREATE TABLE IF NOT EXISTS maintenance_governance_records (
  id BIGSERIAL PRIMARY KEY,
  environment TEXT,
  target_version TEXT NOT NULL,
  operations_owner TEXT,
  regulation_owner TEXT,
  backup_owner TEXT,
  regulation_name TEXT,
  regulation_version_change TEXT,
  regulation_updated_at DATE,
  regulation_result TEXT,
  open_inquiry_count INTEGER NOT NULL DEFAULT 0 CHECK (open_inquiry_count >= 0),
  open_incident_count INTEGER NOT NULL DEFAULT 0 CHECK (open_incident_count >= 0),
  critical_incident_count INTEGER NOT NULL DEFAULT 0 CHECK (critical_incident_count >= 0),
  handoff_notes TEXT,
  fiscal_year INTEGER,
  annual_summary TEXT,
  next_version TEXT,
  next_version_plan TEXT,
  next_review_date DATE,
  decision TEXT NOT NULL DEFAULT 'pending',
  decision_notes TEXT,
  checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_maintenance_governance_fiscal_year ON maintenance_governance_records(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_maintenance_governance_next_review ON maintenance_governance_records(next_review_date);
