-- Part 219: 役割別権限監査記録
CREATE TABLE IF NOT EXISTS role_permission_audit_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_version text NOT NULL,
  result text NOT NULL CHECK (result IN ('passed','failed')),
  issue_count integer NOT NULL DEFAULT 0,
  matrix jsonb NOT NULL,
  issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  executed_by uuid REFERENCES users(id),
  executed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_role_permission_audit_executed_at ON role_permission_audit_snapshots(executed_at DESC);
