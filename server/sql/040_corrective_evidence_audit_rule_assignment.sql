-- Part 133: 監査ルール変更申請の担当者再割当・管理者引継ぎ
ALTER TABLE corrective_evidence_audit_rule_proposals
  ADD COLUMN IF NOT EXISTS assigned_to text,
  ADD COLUMN IF NOT EXISTS assignment_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS escalated_to_administrator boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz,
  ADD COLUMN IF NOT EXISTS escalated_by text,
  ADD COLUMN IF NOT EXISTS escalation_reason text;

CREATE INDEX IF NOT EXISTS idx_audit_rule_proposals_assigned_to
  ON corrective_evidence_audit_rule_proposals (assigned_to);
CREATE INDEX IF NOT EXISTS idx_audit_rule_proposals_escalated
  ON corrective_evidence_audit_rule_proposals (escalated_to_administrator, status);
