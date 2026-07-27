BEGIN;
CREATE TABLE IF NOT EXISTS integrated_operations_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_month date NOT NULL,
  overall_status text NOT NULL CHECK(overall_status IN ('normal','attention','critical')),
  user_management_status text NOT NULL CHECK(user_management_status IN ('normal','attention','critical')),
  regulation_update_status text NOT NULL CHECK(regulation_update_status IN ('normal','attention','critical')),
  security_status text NOT NULL CHECK(security_status IN ('normal','attention','critical')),
  backup_status text NOT NULL CHECK(backup_status IN ('normal','attention','critical')),
  incident_status text NOT NULL CHECK(incident_status IN ('normal','attention','critical')),
  summary text,
  next_actions text,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(review_month)
);
CREATE INDEX IF NOT EXISTS idx_integrated_operations_reviews_month
  ON integrated_operations_reviews(review_month DESC);
COMMIT;
