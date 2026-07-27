CREATE TABLE IF NOT EXISTS production_release_signoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_version text NOT NULL,
  target_user_count integer NOT NULL CHECK (target_user_count BETWEEN 1 AND 500),
  decision text NOT NULL CHECK (decision IN ('hold','pilot-approved','production-approved')),
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  decision_note text,
  approved_by uuid REFERENCES users(id),
  approved_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS production_release_signoffs_approved_at_idx ON production_release_signoffs(approved_at DESC);
