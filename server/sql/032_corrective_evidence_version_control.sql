-- Part 125: corrective evidence version control and authenticity review

ALTER TABLE photo_purge_corrective_evidence
  ADD COLUMN IF NOT EXISTS version_no INTEGER NOT NULL DEFAULT 1 CHECK (version_no >= 1),
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS previous_evidence_id UUID REFERENCES photo_purge_corrective_evidence(id),
  ADD COLUMN IF NOT EXISTS replaced_by_evidence_id UUID REFERENCES photo_purge_corrective_evidence(id),
  ADD COLUMN IF NOT EXISTS replacement_reason TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS original_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS original_verified_by TEXT,
  ADD COLUMN IF NOT EXISTS original_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS original_verification_note TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_corrective_evidence_current_version
  ON photo_purge_corrective_evidence(corrective_action_id, title)
  WHERE is_current = TRUE AND status <> 'removed';

CREATE INDEX IF NOT EXISTS idx_corrective_evidence_version_chain
  ON photo_purge_corrective_evidence(corrective_action_id, previous_evidence_id, version_no);

COMMENT ON COLUMN photo_purge_corrective_evidence.version_no IS '同一証拠資料系列内の版番号。';
COMMENT ON COLUMN photo_purge_corrective_evidence.is_current IS '現行版であることを示す。旧版は削除せず保持する。';
COMMENT ON COLUMN photo_purge_corrective_evidence.original_verified IS '原本または正式発行元資料との照合完了状態。';
