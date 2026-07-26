-- Part 123: recurrence prevention and horizontal deployment
ALTER TABLE photo_purge_corrective_actions
  ADD COLUMN IF NOT EXISTS root_cause_category text NOT NULL DEFAULT 'unclassified',
  ADD COLUMN IF NOT EXISTS recurrence_prevention text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS prevention_owner text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS effectiveness_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS effectiveness_status text NOT NULL DEFAULT 'not-planned',
  ADD COLUMN IF NOT EXISTS effectiveness_verified_by text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS effectiveness_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS effectiveness_note text NOT NULL DEFAULT '';

ALTER TABLE photo_purge_corrective_actions
  DROP CONSTRAINT IF EXISTS photo_purge_corrective_root_cause_category_check;
ALTER TABLE photo_purge_corrective_actions
  ADD CONSTRAINT photo_purge_corrective_root_cause_category_check
  CHECK (root_cause_category IN ('unclassified','human','procedure','system','training','management','external','other'));

ALTER TABLE photo_purge_corrective_actions
  DROP CONSTRAINT IF EXISTS photo_purge_corrective_effectiveness_status_check;
ALTER TABLE photo_purge_corrective_actions
  ADD CONSTRAINT photo_purge_corrective_effectiveness_status_check
  CHECK (effectiveness_status IN ('not-planned','planned','effective','ineffective'));

CREATE TABLE IF NOT EXISTS photo_purge_corrective_deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  corrective_action_id text NOT NULL,
  target_office text NOT NULL,
  deployment_note text NOT NULL,
  deployment_status text NOT NULL DEFAULT 'shared'
    CHECK (deployment_status IN ('shared','acknowledged','completed')),
  shared_by text NOT NULL,
  shared_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_by text,
  acknowledged_at timestamptz,
  completed_by text,
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_corrective_effectiveness_due
  ON photo_purge_corrective_actions (effectiveness_status, effectiveness_due_at);
CREATE INDEX IF NOT EXISTS idx_corrective_deployment_action
  ON photo_purge_corrective_deployments (corrective_action_id, deployment_status);
