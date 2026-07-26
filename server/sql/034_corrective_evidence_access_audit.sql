BEGIN;

ALTER TABLE corrective_evidence_access_logs
  ADD COLUMN IF NOT EXISTS outcome varchar(20) NOT NULL DEFAULT 'allowed',
  ADD COLUMN IF NOT EXISTS denial_reason varchar(50) NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS corrective_evidence_access_audit_findings (
  id text PRIMARY KEY,
  finding_type varchar(50) NOT NULL,
  severity varchar(20) NOT NULL CHECK (severity IN ('medium','high')),
  office_id text NOT NULL,
  actor text NOT NULL,
  actor_role text NOT NULL DEFAULT '',
  evidence_id text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  occurred_at timestamptz NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  source_log_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  status varchar(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  reviewed_by text NOT NULL DEFAULT '',
  reviewed_at timestamptz,
  review_note text NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_corrective_evidence_audit_open
  ON corrective_evidence_access_audit_findings (office_id, status, severity, occurred_at DESC);

COMMIT;
