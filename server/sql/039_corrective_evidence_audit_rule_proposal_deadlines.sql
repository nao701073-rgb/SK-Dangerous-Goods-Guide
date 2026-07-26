-- Part 132: access-audit rule proposal deadlines and notification acknowledgements
ALTER TABLE corrective_evidence_audit_rule_proposals
  ADD COLUMN IF NOT EXISTS approval_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS application_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS notification_acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS notification_acknowledged_by text;

CREATE INDEX IF NOT EXISTS idx_ce_audit_rule_proposal_approval_due
  ON corrective_evidence_audit_rule_proposals (status, approval_due_at);

CREATE INDEX IF NOT EXISTS idx_ce_audit_rule_proposal_application_due
  ON corrective_evidence_audit_rule_proposals (status, application_due_at);
