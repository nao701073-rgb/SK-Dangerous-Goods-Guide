-- Part 118: 写真完全削除証明書の検証履歴
CREATE TABLE IF NOT EXISTS photo_purge_certificate_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id text NOT NULL,
  purge_plan_id text NOT NULL,
  office_id text,
  verified_by text NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now(),
  is_valid boolean NOT NULL,
  supplied_hash text NOT NULL,
  calculated_hash text NOT NULL,
  linked_plan_found boolean NOT NULL DEFAULT false,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  verification_payload jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_photo_purge_cert_verify_certificate
  ON photo_purge_certificate_verifications (certificate_id, verified_at DESC);
CREATE INDEX IF NOT EXISTS idx_photo_purge_cert_verify_plan
  ON photo_purge_certificate_verifications (purge_plan_id, verified_at DESC);
CREATE INDEX IF NOT EXISTS idx_photo_purge_cert_verify_invalid
  ON photo_purge_certificate_verifications (verified_at DESC)
  WHERE is_valid = false;
