CREATE TABLE IF NOT EXISTS operations_acceptance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_type text NOT NULL CHECK (review_type IN ('initial','major-update','quarterly','annual')),
  target_version text,
  target_users integer NOT NULL DEFAULT 50 CHECK (target_users BETWEEN 1 AND 500),
  review_date date NOT NULL,
  overall_decision text NOT NULL DEFAULT 'hold' CHECK (overall_decision IN ('hold','conditional','accepted')),
  domain_results jsonb NOT NULL DEFAULT '{}'::jsonb,
  overall_note text,
  follow_up_note text,
  next_review_date date,
  reviewed_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS operations_acceptance_reviews_review_date_idx ON operations_acceptance_reviews(review_date DESC);
