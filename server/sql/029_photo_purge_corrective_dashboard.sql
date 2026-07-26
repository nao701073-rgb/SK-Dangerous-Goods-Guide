-- Part 122: corrective action dashboard and escalation
ALTER TABLE photo_purge_corrective_actions
  ADD COLUMN IF NOT EXISTS escalation_level varchar(32) NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS escalated_by varchar(255),
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz,
  ADD COLUMN IF NOT EXISTS escalation_reason text;

ALTER TABLE photo_purge_corrective_actions
  DROP CONSTRAINT IF EXISTS photo_purge_corrective_actions_escalation_level_check;
ALTER TABLE photo_purge_corrective_actions
  ADD CONSTRAINT photo_purge_corrective_actions_escalation_level_check
  CHECK (escalation_level IN ('none', 'administrator'));

CREATE INDEX IF NOT EXISTS idx_photo_purge_corrective_due_status
  ON photo_purge_corrective_actions (status, due_at);
CREATE INDEX IF NOT EXISTS idx_photo_purge_corrective_target_month_office
  ON photo_purge_corrective_actions (target_month, office_id);
CREATE INDEX IF NOT EXISTS idx_photo_purge_corrective_escalation
  ON photo_purge_corrective_actions (escalation_level, escalated_at);
