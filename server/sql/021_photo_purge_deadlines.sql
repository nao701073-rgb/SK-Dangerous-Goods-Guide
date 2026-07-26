-- Part 114: photo purge deadlines and assignments

ALTER TABLE photo_purge_plans
  ADD COLUMN IF NOT EXISTS assigned_approver TEXT,
  ADD COLUMN IF NOT EXISTS approval_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS execution_due_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_photo_purge_plans_approval_due
  ON photo_purge_plans (approval_due_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_photo_purge_plans_execution_due
  ON photo_purge_plans (execution_due_at)
  WHERE status = 'approved';

COMMENT ON COLUMN photo_purge_plans.assigned_approver IS '任意の承認担当者名';
COMMENT ON COLUMN photo_purge_plans.approval_due_at IS '削除計画の承認期限';
COMMENT ON COLUMN photo_purge_plans.execution_due_at IS '承認後の完全削除実行期限';
