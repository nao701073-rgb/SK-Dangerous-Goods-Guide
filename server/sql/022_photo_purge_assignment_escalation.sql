-- Part 115: photo purge assignment handoff and escalation

ALTER TABLE photo_purge_plans
  ADD COLUMN IF NOT EXISTS escalated BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS escalated_by TEXT,
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalation_reason TEXT;

CREATE TABLE IF NOT EXISTS photo_purge_assignment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES photo_purge_plans(id) ON DELETE RESTRICT,
  previous_assignee TEXT,
  new_assignee TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  change_reason TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('reassignment', 'administrator_escalation')),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photo_purge_assignment_history_plan
  ON photo_purge_assignment_history (plan_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_photo_purge_plans_escalated
  ON photo_purge_plans (escalated, status, escalated_at DESC)
  WHERE escalated = TRUE;

COMMENT ON TABLE photo_purge_assignment_history IS '写真完全削除計画の担当者再割当・管理者引継ぎ履歴';
COMMENT ON COLUMN photo_purge_plans.escalated IS '期限超過等により管理者対応へ引き継いだか';
