-- Part 236: improvement plans, post-approval follow-up and annual closing
CREATE TABLE IF NOT EXISTS operations_acceptance_improvement_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES operations_acceptance_reviews(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN ('operation','security','data','training','performance','other')),
  owner_name text,
  due_date date,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','working','completed','carried-over')),
  detail text NOT NULL,
  completion_evidence text,
  created_by uuid REFERENCES users(id),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_acceptance_improvement_due ON operations_acceptance_improvement_plans(status,due_date);

CREATE TABLE IF NOT EXISTS operations_acceptance_annual_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  closing_year integer NOT NULL UNIQUE CHECK (closing_year BETWEEN 2020 AND 2100),
  overall_decision text NOT NULL CHECK (overall_decision IN ('stable','observe','improvement-required')),
  annual_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  closing_note text,
  carry_over_note text,
  next_review_date date,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
