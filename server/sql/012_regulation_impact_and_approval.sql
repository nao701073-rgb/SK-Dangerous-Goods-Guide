-- Part 101: cross-regulation impact assessment and segregation of duties
CREATE TABLE IF NOT EXISTS regulation_impact_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_set_id uuid NOT NULL REFERENCES regulation_change_sets(id) ON DELETE CASCADE,
  affected_regulation_id text NOT NULL,
  affected_target_key text NOT NULL,
  review_domain text NOT NULL,
  review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending','reviewed','not-applicable')),
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  evidence_reference text,
  UNIQUE(change_set_id, affected_regulation_id, affected_target_key, review_domain)
);
ALTER TABLE regulation_change_sets ADD COLUMN IF NOT EXISTS prepared_by uuid REFERENCES users(id);
ALTER TABLE regulation_change_sets ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES users(id);
ALTER TABLE regulation_change_sets ADD COLUMN IF NOT EXISTS impact_review_completed boolean NOT NULL DEFAULT false;
ALTER TABLE regulation_change_sets DROP CONSTRAINT IF EXISTS regulation_change_sets_no_self_approval;
ALTER TABLE regulation_change_sets ADD CONSTRAINT regulation_change_sets_no_self_approval CHECK (approved_by IS NULL OR prepared_by IS NULL OR approved_by <> prepared_by);
CREATE INDEX IF NOT EXISTS idx_regulation_impact_pending ON regulation_impact_assessments(change_set_id,review_status);
