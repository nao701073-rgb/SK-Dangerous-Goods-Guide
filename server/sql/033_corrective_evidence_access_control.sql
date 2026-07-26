-- Part 126: corrective evidence access control and audit logs

ALTER TABLE photo_purge_corrective_evidence
  ADD COLUMN IF NOT EXISTS access_level TEXT NOT NULL DEFAULT 'office'
    CHECK (access_level IN ('office', 'office-admin', 'administrator')),
  ADD COLUMN IF NOT EXISTS download_restricted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS access_policy_updated_by TEXT,
  ADD COLUMN IF NOT EXISTS access_policy_updated_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS corrective_evidence_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corrective_action_id UUID NOT NULL REFERENCES photo_purge_corrective_actions(id),
  evidence_id UUID NOT NULL REFERENCES photo_purge_corrective_evidence(id),
  office_id TEXT NOT NULL,
  certificate_id TEXT,
  evidence_title TEXT NOT NULL,
  version_no INTEGER NOT NULL DEFAULT 1,
  access_level TEXT NOT NULL CHECK (access_level IN ('office', 'office-admin', 'administrator')),
  operation TEXT NOT NULL CHECK (operation IN ('view', 'download')),
  actor TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corrective_evidence_access_logs_evidence
  ON corrective_evidence_access_logs(evidence_id, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_corrective_evidence_access_logs_office
  ON corrective_evidence_access_logs(office_id, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_corrective_evidence_access_logs_actor
  ON corrective_evidence_access_logs(actor, accessed_at DESC);

COMMENT ON COLUMN photo_purge_corrective_evidence.access_level IS 'office:所属事業所、office-admin:事業所管理者・管理者、administrator:管理者のみ。';
COMMENT ON COLUMN photo_purge_corrective_evidence.download_restricted IS 'TRUEの場合、ダウンロード理由の記録を必須とする。';
