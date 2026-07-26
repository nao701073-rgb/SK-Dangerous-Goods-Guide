-- Part 119: 写真完全削除証明書台帳の検索性能向上
CREATE INDEX IF NOT EXISTS idx_photo_purge_certificates_office_executed
  ON photo_purge_certificates (office_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_photo_purge_certificates_plan
  ON photo_purge_certificates (purge_plan_id);
CREATE INDEX IF NOT EXISTS idx_photo_purge_certificates_certificate_id
  ON photo_purge_certificates (certificate_id);
