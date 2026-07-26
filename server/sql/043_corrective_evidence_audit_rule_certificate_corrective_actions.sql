-- Part 136: 監査ルール適用証明の月次照合・是正処置
CREATE TABLE IF NOT EXISTS corrective_evidence_audit_rule_certificate_corrective_actions (
  id TEXT PRIMARY KEY,
  issue_key TEXT NOT NULL,
  issue_type TEXT NOT NULL,
  title TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  certificate_id TEXT NOT NULL DEFAULT '',
  proposal_id TEXT NOT NULL DEFAULT '',
  target_month CHAR(7) NOT NULL DEFAULT '',
  office_id TEXT NOT NULL,
  office_name TEXT NOT NULL,
  cause TEXT NOT NULL,
  action_plan TEXT NOT NULL,
  assigned_to TEXT NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open','pending-verification','closed')),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_by TEXT NOT NULL DEFAULT '',
  completed_at TIMESTAMPTZ,
  completion_note TEXT NOT NULL DEFAULT '',
  verified_by TEXT NOT NULL DEFAULT '',
  verified_at TIMESTAMPTZ,
  verification_note TEXT NOT NULL DEFAULT '',
  UNIQUE (office_id, issue_key, status)
);

CREATE INDEX IF NOT EXISTS idx_audit_rule_certificate_corrective_status_due
  ON corrective_evidence_audit_rule_certificate_corrective_actions (status, due_at);
CREATE INDEX IF NOT EXISTS idx_audit_rule_certificate_corrective_certificate
  ON corrective_evidence_audit_rule_certificate_corrective_actions (certificate_id);
CREATE INDEX IF NOT EXISTS idx_audit_rule_certificate_corrective_proposal
  ON corrective_evidence_audit_rule_certificate_corrective_actions (proposal_id);
