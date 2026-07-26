CREATE TABLE IF NOT EXISTS import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_type text NOT NULL, source text NOT NULL DEFAULT 'csv', status text NOT NULL DEFAULT 'completed',
  total_count integer NOT NULL DEFAULT 0, success_count integer NOT NULL DEFAULT 0, error_count integer NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb, executed_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_import_runs_created_at ON import_runs(created_at DESC);
