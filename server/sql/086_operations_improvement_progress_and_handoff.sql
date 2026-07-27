-- Part 237: improvement progress history, handoff and annual comparison snapshots
CREATE TABLE IF NOT EXISTS operations_acceptance_improvement_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES operations_acceptance_improvement_plans(id) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL CHECK (new_status IN ('planned','working','completed','carried-over')),
  progress_note text,
  changed_by uuid REFERENCES users(id),
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_acceptance_improvement_progress_plan ON operations_acceptance_improvement_progress(plan_id,changed_at DESC);

CREATE TABLE IF NOT EXISTS operations_acceptance_handoff_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_year integer NOT NULL CHECK (target_year BETWEEN 2020 AND 2100),
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  handoff_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_by uuid REFERENCES users(id),
  generated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_acceptance_handoff_year ON operations_acceptance_handoff_exports(target_year,generated_at DESC);
