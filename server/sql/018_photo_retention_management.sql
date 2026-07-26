-- Part 111: 写真保存期間・保全指定
ALTER TABLE application_photos
  ADD COLUMN IF NOT EXISTS retention_hold boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS retention_hold_reason text,
  ADD COLUMN IF NOT EXISTS retention_hold_by text,
  ADD COLUMN IF NOT EXISTS retention_hold_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_application_photos_retention_hold
  ON application_photos (office_id, retention_hold, shooting_at);

CREATE TABLE IF NOT EXISTS photo_retention_policies (
  office_id text PRIMARY KEY,
  retention_days integer NOT NULL DEFAULT 365 CHECK (retention_days BETWEEN 30 AND 3650),
  deleted_grace_days integer NOT NULL DEFAULT 30 CHECK (deleted_grace_days BETWEEN 1 AND 365),
  updated_by text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
