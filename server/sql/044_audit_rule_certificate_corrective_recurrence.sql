-- Part 137: 適用証明是正処置の再発防止・管理者レビュー
ALTER TABLE corrective_evidence_audit_rule_certificate_corrective_actions
  ADD COLUMN IF NOT EXISTS root_cause_category text,
  ADD COLUMN IF NOT EXISTS prevention_plan text,
  ADD COLUMN IF NOT EXISTS prevention_owner text,
  ADD COLUMN IF NOT EXISTS prevention_review_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS prevention_updated_by text,
  ADD COLUMN IF NOT EXISTS prevention_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS management_review_status text,
  ADD COLUMN IF NOT EXISTS management_reviewed_by text,
  ADD COLUMN IF NOT EXISTS management_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS management_review_note text;

CREATE INDEX IF NOT EXISTS idx_rule_certificate_corrective_root_cause
  ON corrective_evidence_audit_rule_certificate_corrective_actions(root_cause_category);
CREATE INDEX IF NOT EXISTS idx_rule_certificate_corrective_review_due
  ON corrective_evidence_audit_rule_certificate_corrective_actions(prevention_review_due_at);
