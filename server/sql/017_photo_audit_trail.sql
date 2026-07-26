-- Part 110: 写真操作履歴・論理削除

ALTER TABLE photos
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by varchar(200),
  ADD COLUMN IF NOT EXISTS deletion_reason text,
  ADD COLUMN IF NOT EXISTS restored_at timestamptz,
  ADD COLUMN IF NOT EXISTS restored_by varchar(200);

CREATE TABLE IF NOT EXISTS photo_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid,
  application_id uuid,
  application_number varchar(200) NOT NULL DEFAULT '',
  office_id varchar(100) NOT NULL,
  actor varchar(200) NOT NULL,
  action varchar(30) NOT NULL CHECK (action IN ('create', 'update', 'delete', 'restore')),
  reason text NOT NULL DEFAULT '',
  before_data jsonb,
  after_data jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_photo_audit_logs_photo_id ON photo_audit_logs(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_audit_logs_application_id ON photo_audit_logs(application_id);
CREATE INDEX IF NOT EXISTS idx_photo_audit_logs_office_time ON photo_audit_logs(office_id, occurred_at DESC);
