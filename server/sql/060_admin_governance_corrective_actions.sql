-- Part 202: 管理者ガバナンス是正対応・統合ダッシュボード
CREATE TABLE IF NOT EXISTS admin_governance_corrective_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('access-review','recovery-drill','audit','incident','other')),
  source_id uuid NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in-progress','completed','cancelled')),
  owner_user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  due_date date NULL,
  completion_note text NOT NULL DEFAULT '',
  completed_at timestamptz NULL,
  completed_by uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_governance_actions_status_due ON admin_governance_corrective_actions(status,due_date);
CREATE INDEX IF NOT EXISTS idx_admin_governance_actions_owner ON admin_governance_corrective_actions(owner_user_id,status);
