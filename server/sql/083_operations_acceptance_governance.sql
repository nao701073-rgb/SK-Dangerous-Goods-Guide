-- Part 234 (corrected in Part 235): operations acceptance governance
CREATE TABLE IF NOT EXISTS operations_acceptance_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES operations_acceptance_reviews(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending','approved','returned')),
  comment text,
  decided_by uuid REFERENCES users(id),
  decided_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS operations_acceptance_corrective_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES operations_acceptance_reviews(id) ON DELETE SET NULL,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','high','urgent')),
  due_date date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','working','completed')),
  detail text NOT NULL,
  completion_evidence text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_operations_acceptance_approvals_review ON operations_acceptance_approvals(review_id, decided_at DESC);
CREATE INDEX IF NOT EXISTS idx_operations_acceptance_corrective_due ON operations_acceptance_corrective_actions(status, due_date);
