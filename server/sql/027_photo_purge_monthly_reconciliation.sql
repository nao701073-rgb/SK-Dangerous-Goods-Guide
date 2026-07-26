-- Part 120: 写真完全削除証明書の月次照合履歴
CREATE TABLE IF NOT EXISTS photo_purge_monthly_reconciliations (
  id UUID PRIMARY KEY,
  target_month DATE NOT NULL,
  office_id TEXT,
  generated_by TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  certificate_count INTEGER NOT NULL DEFAULT 0,
  valid_count INTEGER NOT NULL DEFAULT 0,
  invalid_count INTEGER NOT NULL DEFAULT 0,
  deleted_photo_count INTEGER NOT NULL DEFAULT 0,
  deleted_bytes BIGINT NOT NULL DEFAULT 0,
  issue_count INTEGER NOT NULL DEFAULT 0,
  report_json JSONB NOT NULL,
  report_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_photo_purge_monthly_reconciliation_month_office
  ON photo_purge_monthly_reconciliations (target_month, office_id);
