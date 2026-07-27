-- Part 214 cloud pilot launch package
CREATE TABLE IF NOT EXISTS pilot_launch_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  target_user_count integer NOT NULL CHECK (target_user_count BETWEEN 1 AND 150),
  start_date date,
  status text NOT NULL DEFAULT 'preparing' CHECK (status IN ('preparing','running','completed','cancelled')),
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS pilot_verification_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES pilot_launch_batches(id) ON DELETE SET NULL,
  test_type text NOT NULL CHECK (test_type IN ('permission-matrix','load-50','load-150','mail','backup-restore','login','photo-storage')),
  status text NOT NULL CHECK (status IN ('passed','warning','failed')),
  executed_at timestamptz NOT NULL DEFAULT now(),
  evidence text,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  executed_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pilot_verification_type_date ON pilot_verification_results(test_type,executed_at DESC);
