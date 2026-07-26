-- Part 146: 本番導入・リリース判定
CREATE TABLE IF NOT EXISTS production_release_decisions (
  id BIGSERIAL PRIMARY KEY,
  decision_id TEXT NOT NULL UNIQUE,
  office_id TEXT,
  release_name TEXT NOT NULL,
  release_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('approved', 'cancelled', 'superseded')),
  prepared_by TEXT NOT NULL,
  prepared_at TIMESTAMPTZ NOT NULL,
  approved_by TEXT NOT NULL,
  approver_role TEXT NOT NULL CHECK (approver_role IN ('office-admin', 'admin')),
  approved_at TIMESTAMPTZ NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  comment TEXT NOT NULL DEFAULT '',
  diagnosis JSONB NOT NULL,
  checklist JSONB NOT NULL,
  configuration_snapshot JSONB NOT NULL,
  verification_sha256 TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (prepared_by <> approved_by)
);

CREATE INDEX IF NOT EXISTS idx_production_release_decisions_office_schedule
  ON production_release_decisions (office_id, scheduled_at DESC);

CREATE TABLE IF NOT EXISTS production_configuration_snapshots (
  id BIGSERIAL PRIMARY KEY,
  snapshot_id TEXT NOT NULL UNIQUE,
  office_id TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  configuration JSONB NOT NULL,
  verification_sha256 TEXT NOT NULL
);
