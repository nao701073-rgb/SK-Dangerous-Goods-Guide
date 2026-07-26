-- Part 124: corrective action evidence attachments and independent review

CREATE TABLE IF NOT EXISTS photo_purge_corrective_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corrective_action_id UUID NOT NULL REFERENCES photo_purge_corrective_actions(id) ON DELETE CASCADE,
  category VARCHAR(40) NOT NULL CHECK (category IN ('implementation','effectiveness','horizontal-deployment','other')),
  title TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 5242880),
  storage_key TEXT NOT NULL,
  sha256 VARCHAR(64) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending-review' CHECK (status IN ('pending-review','reviewed','rejected','removed')),
  uploaded_by TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT NOT NULL DEFAULT '',
  removed_by TEXT,
  removed_at TIMESTAMPTZ,
  remove_reason TEXT NOT NULL DEFAULT '',
  CONSTRAINT evidence_reviewer_separation CHECK (reviewed_by IS NULL OR reviewed_by <> uploaded_by)
);

CREATE INDEX IF NOT EXISTS idx_corrective_evidence_action ON photo_purge_corrective_evidence(corrective_action_id, status, category);
CREATE UNIQUE INDEX IF NOT EXISTS uq_corrective_evidence_active_hash ON photo_purge_corrective_evidence(corrective_action_id, sha256) WHERE status <> 'removed';

COMMENT ON TABLE photo_purge_corrective_evidence IS '是正処置・再発防止策の実施証拠および効果確認資料。ファイル本体は社内ストレージに保存し、本表には参照キーとハッシュを保持する。';
