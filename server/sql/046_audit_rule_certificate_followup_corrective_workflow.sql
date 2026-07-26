-- Part 139: 再是正処置の進捗・担当者変更・完了確認
ALTER TABLE corrective_evidence_audit_rule_certificate_corrective_actions
  ADD COLUMN IF NOT EXISTS progress_percent integer NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS latest_progress_note text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS progress_updated_by text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS progress_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS reassigned_by text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS reassigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS reassignment_reason text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS follow_up_resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS follow_up_resolved_by text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS follow_up_resolution_note text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS corrective_evidence_audit_rule_certificate_followup_progress (
  id bigserial PRIMARY KEY,
  corrective_action_id text NOT NULL,
  progress_percent integer NOT NULL CHECK (progress_percent BETWEEN 0 AND 100),
  note text NOT NULL,
  updated_by text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS corrective_evidence_audit_rule_certificate_followup_assignments (
  id bigserial PRIMARY KEY,
  corrective_action_id text NOT NULL,
  previous_assigned_to text NOT NULL DEFAULT '',
  assigned_to text NOT NULL,
  reason text NOT NULL,
  changed_by text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_rule_certificate_followup_progress_action
  ON corrective_evidence_audit_rule_certificate_followup_progress(corrective_action_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_rule_certificate_followup_assignment_action
  ON corrective_evidence_audit_rule_certificate_followup_assignments(corrective_action_id, changed_at DESC);
