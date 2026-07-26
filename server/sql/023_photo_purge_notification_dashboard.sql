-- Part 116: photo purge notification acknowledgement and dashboard support
ALTER TABLE photo_purge_plans
  ADD COLUMN IF NOT EXISTS notification_acknowledged_by text,
  ADD COLUMN IF NOT EXISTS notification_acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS notification_history jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_photo_purge_plans_notification_unacknowledged
  ON photo_purge_plans (office_id, status, approval_due_at, execution_due_at)
  WHERE status IN ('pending', 'approved') AND notification_acknowledged_at IS NULL;

COMMENT ON COLUMN photo_purge_plans.notification_acknowledged_by IS '完全削除計画通知の確認者';
COMMENT ON COLUMN photo_purge_plans.notification_acknowledged_at IS '完全削除計画通知の確認日時';
COMMENT ON COLUMN photo_purge_plans.notification_history IS '通知確認等の履歴。画像本体は含めない';
