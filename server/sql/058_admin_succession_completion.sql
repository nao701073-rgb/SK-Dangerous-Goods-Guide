-- Part 200: Post-transition stabilization review and succession completion.
ALTER TABLE admin_succession_requests
  ADD COLUMN IF NOT EXISTS finalized_at timestamptz,
  ADD COLUMN IF NOT EXISTS finalized_by uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS finalization_note text,
  ADD COLUMN IF NOT EXISTS former_admin_reduction_due timestamptz,
  ADD COLUMN IF NOT EXISTS former_admin_reduction_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS former_admin_reduction_confirmed_by uuid REFERENCES users(id);

CREATE TABLE IF NOT EXISTS admin_succession_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  succession_request_id uuid NOT NULL REFERENCES admin_succession_requests(id) ON DELETE CASCADE,
  reviewed_by uuid NOT NULL REFERENCES users(id),
  review_type text NOT NULL DEFAULT 'stabilization' CHECK (review_type IN ('stabilization','periodic','incident')),
  checks jsonb NOT NULL,
  incident_count integer NOT NULL DEFAULT 0 CHECK (incident_count >= 0),
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_succession_reviews_request_created
  ON admin_succession_reviews(succession_request_id, created_at DESC);
