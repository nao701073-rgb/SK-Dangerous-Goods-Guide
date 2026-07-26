BEGIN;

CREATE TABLE IF NOT EXISTS photo_purge_certificates (
  id BIGSERIAL PRIMARY KEY,
  certificate_id TEXT NOT NULL UNIQUE,
  purge_plan_id TEXT NOT NULL,
  office_id TEXT NOT NULL,
  office_name TEXT NOT NULL,
  applications JSONB NOT NULL DEFAULT '[]'::jsonb,
  reason TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  approved_by TEXT NOT NULL,
  approved_at TIMESTAMPTZ NOT NULL,
  executed_by TEXT NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL,
  deleted_photo_count INTEGER NOT NULL CHECK (deleted_photo_count >= 0),
  deleted_bytes BIGINT NOT NULL CHECK (deleted_bytes >= 0),
  target_photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  result TEXT NOT NULL DEFAULT 'completed' CHECK (result IN ('completed', 'failed', 'partial')),
  verification_hash TEXT NOT NULL,
  certificate_payload JSONB NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_photo_purge_certificates_plan
  ON photo_purge_certificates (purge_plan_id);
CREATE INDEX IF NOT EXISTS idx_photo_purge_certificates_office_executed
  ON photo_purge_certificates (office_id, executed_at DESC);

COMMENT ON TABLE photo_purge_certificates IS '承認済み写真完全削除計画の実行証明書。画像本体は保持せず、対象識別情報と監査情報を保持する。';

COMMIT;
