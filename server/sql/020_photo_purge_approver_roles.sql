-- Part 113: 写真完全削除計画の承認権限を明確化
-- 承認・実行可能なロールは office-admin（事業所管理者）と
-- safety-environment-admin（画面表示名: 管理者）のみとする。

ALTER TABLE photo_purge_plans
  ADD COLUMN IF NOT EXISTS approved_by_role VARCHAR(40);

ALTER TABLE photo_purge_plans
  ADD COLUMN IF NOT EXISTS executed_by_role VARCHAR(40);

ALTER TABLE photo_purge_plans
  DROP CONSTRAINT IF EXISTS photo_purge_approved_role_check;

ALTER TABLE photo_purge_plans
  ADD CONSTRAINT photo_purge_approved_role_check
  CHECK (approved_by_role IS NULL OR approved_by_role IN ('office-admin', 'safety-environment-admin'));

ALTER TABLE photo_purge_plans
  DROP CONSTRAINT IF EXISTS photo_purge_executed_role_check;

ALTER TABLE photo_purge_plans
  ADD CONSTRAINT photo_purge_executed_role_check
  CHECK (executed_by_role IS NULL OR executed_by_role IN ('office-admin', 'safety-environment-admin'));
