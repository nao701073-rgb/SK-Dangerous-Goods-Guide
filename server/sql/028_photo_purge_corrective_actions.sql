-- Part 121: 月次照合の是正処置管理
CREATE TABLE IF NOT EXISTS photo_purge_corrective_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_key text NOT NULL UNIQUE,
  issue_type text NOT NULL,
  certificate_id text,
  plan_id text,
  target_month char(7),
  office_id uuid NOT NULL,
  issue_message text,
  cause text NOT NULL,
  corrective_action text NOT NULL,
  assigned_to text NOT NULL,
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','completed-awaiting-verification','closed','cancelled')),
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_by text,
  completed_at timestamptz,
  completion_note text,
  verified_by text,
  verified_at timestamptz,
  verification_note text,
  history jsonb NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_photo_purge_corrective_office_status_due
  ON photo_purge_corrective_actions (office_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_photo_purge_corrective_target_month
  ON photo_purge_corrective_actions (target_month, office_id);
