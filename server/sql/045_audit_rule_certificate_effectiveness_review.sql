-- Part 138: 再発防止策の効果確認・再是正
ALTER TABLE corrective_evidence_audit_rule_certificate_corrective_actions
  ADD COLUMN IF NOT EXISTS effectiveness_status text,
  ADD COLUMN IF NOT EXISTS effectiveness_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS effectiveness_criteria text,
  ADD COLUMN IF NOT EXISTS effectiveness_scheduled_by text,
  ADD COLUMN IF NOT EXISTS effectiveness_scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS effectiveness_reviewed_by text,
  ADD COLUMN IF NOT EXISTS effectiveness_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS effectiveness_result_note text,
  ADD COLUMN IF NOT EXISTS follow_up_corrective_action_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS follow_up_corrective_action_id text,
  ADD COLUMN IF NOT EXISTS parent_corrective_action_id text;

CREATE INDEX IF NOT EXISTS idx_audit_rule_certificate_corrective_effectiveness
  ON corrective_evidence_audit_rule_certificate_corrective_actions(effectiveness_status, effectiveness_due_at);
