-- Part 128: access audit recurrence prevention and completion review
ALTER TABLE corrective_evidence_audit_findings
  ADD COLUMN IF NOT EXISTS recurrence_prevention text,
  ADD COLUMN IF NOT EXISTS review_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS completion_reviewed_by text,
  ADD COLUMN IF NOT EXISTS completion_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS completion_review_note text;

CREATE INDEX IF NOT EXISTS idx_corrective_evidence_audit_review_due
  ON corrective_evidence_audit_findings (status, review_due_at);
