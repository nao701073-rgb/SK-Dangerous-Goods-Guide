-- Part 140: 再是正後の再評価・案件クローズ
ALTER TABLE corrective_evidence_audit_rule_certificate_corrective_actions
  ADD COLUMN IF NOT EXISTS followup_reevaluation_status text NOT NULL DEFAULT 'not-scheduled',
  ADD COLUMN IF NOT EXISTS followup_reevaluation_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS followup_reevaluation_criteria text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS followup_reevaluation_scheduled_by text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS followup_reevaluation_scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS followup_reevaluation_reviewed_by text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS followup_reevaluation_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS followup_reevaluation_note text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS case_closure_status text NOT NULL DEFAULT 'not-ready',
  ADD COLUMN IF NOT EXISTS case_closed_by text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS case_closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS case_closure_note text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS followup_corrective_action_history jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE corrective_evidence_audit_rule_certificate_corrective_actions
  DROP CONSTRAINT IF EXISTS audit_rule_certificate_followup_reevaluation_status_check;
ALTER TABLE corrective_evidence_audit_rule_certificate_corrective_actions
  ADD CONSTRAINT audit_rule_certificate_followup_reevaluation_status_check
  CHECK (followup_reevaluation_status IN ('not-scheduled','pending','no-recurrence','recurrence-detected'));

ALTER TABLE corrective_evidence_audit_rule_certificate_corrective_actions
  DROP CONSTRAINT IF EXISTS audit_rule_certificate_case_closure_status_check;
ALTER TABLE corrective_evidence_audit_rule_certificate_corrective_actions
  ADD CONSTRAINT audit_rule_certificate_case_closure_status_check
  CHECK (case_closure_status IN ('not-ready','pending-approval','blocked','closed'));

CREATE INDEX IF NOT EXISTS idx_audit_rule_certificate_followup_reevaluation
  ON corrective_evidence_audit_rule_certificate_corrective_actions
  (followup_reevaluation_status, followup_reevaluation_due_at);
CREATE INDEX IF NOT EXISTS idx_audit_rule_certificate_case_closure
  ON corrective_evidence_audit_rule_certificate_corrective_actions
  (case_closure_status, case_closed_at);
