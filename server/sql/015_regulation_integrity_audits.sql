CREATE TABLE IF NOT EXISTS regulation_integrity_audits (
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id UUID,
  regulation_id TEXT NOT NULL,
  edition_label TEXT,
  audited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  audited_by TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('passed', 'attention-required')),
  source_pdf_sha256 TEXT,
  dataset_sha256 TEXT,
  manifest_sha256 TEXT,
  report_sha256 TEXT NOT NULL,
  issue_count INTEGER NOT NULL DEFAULT 0,
  report_json JSONB NOT NULL,
  CONSTRAINT regulation_integrity_report_sha256_format CHECK (report_sha256 ~ '^[a-f0-9]{64}$')
);
CREATE INDEX IF NOT EXISTS idx_regulation_integrity_audits_lookup
  ON regulation_integrity_audits (regulation_id, edition_label, audited_at DESC);
