-- Part 134: 監査ルール変更申請の処理イベント・適用証明台帳

CREATE TABLE IF NOT EXISTS corrective_evidence_audit_rule_proposal_events (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  actor TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  status_after TEXT,
  reason TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_audit_rule_proposal_events_proposal_time
  ON corrective_evidence_audit_rule_proposal_events (proposal_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS corrective_evidence_audit_rule_application_certificates (
  certificate_id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL UNIQUE,
  proposal_type TEXT NOT NULL CHECK (proposal_type IN ('change', 'rollback')),
  certificate_body JSONB NOT NULL,
  verification_hash TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_rule_application_certificates_applied_at
  ON corrective_evidence_audit_rule_application_certificates (applied_at DESC);
