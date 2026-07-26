CREATE TABLE IF NOT EXISTS validation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  environment_name text NOT NULL DEFAULT '社内検証環境',
  executed_by uuid REFERENCES users(id),
  status text NOT NULL DEFAULT '実施中' CHECK (status IN ('未実施','実施中','合格','要改善','中止')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS validation_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES validation_runs(id) ON DELETE CASCADE,
  test_key text NOT NULL,
  category text NOT NULL,
  test_name text NOT NULL,
  expected_result text NOT NULL DEFAULT '',
  actual_result text NOT NULL DEFAULT '',
  result text NOT NULL DEFAULT '未実施' CHECK (result IN ('未実施','合格','不合格','対象外')),
  note text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(run_id, test_key)
);

CREATE INDEX IF NOT EXISTS idx_validation_runs_created ON validation_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_validation_results_run ON validation_results(run_id, sort_order);
