-- Part 112: 写真完全削除計画・承認管理
CREATE TABLE IF NOT EXISTS photo_purge_plans (
  id UUID PRIMARY KEY,
  office_id UUID NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending','approved','executed','cancelled')),
  reason TEXT NOT NULL,
  photo_count INTEGER NOT NULL CHECK (photo_count > 0),
  total_bytes BIGINT NOT NULL CHECK (total_bytes >= 0),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  executed_by UUID,
  executed_at TIMESTAMPTZ,
  cancelled_by UUID,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  CONSTRAINT photo_purge_separation CHECK (approved_by IS NULL OR approved_by <> created_by)
);

CREATE TABLE IF NOT EXISTS photo_purge_plan_items (
  plan_id UUID NOT NULL REFERENCES photo_purge_plans(id) ON DELETE RESTRICT,
  photo_id UUID NOT NULL,
  application_id UUID,
  file_size BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (plan_id, photo_id)
);

CREATE INDEX IF NOT EXISTS idx_photo_purge_plans_office_status
  ON photo_purge_plans (office_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photo_purge_plan_items_photo
  ON photo_purge_plan_items (photo_id);
