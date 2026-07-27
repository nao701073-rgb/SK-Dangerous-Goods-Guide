-- Part 228: activity audit governance, approval, report scheduling and retention preview
ALTER TABLE activity_audit_reviews
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','returned')),
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_note text;

CREATE TABLE IF NOT EXISTS activity_report_schedules (
  id bigserial PRIMARY KEY,
  report_type text NOT NULL CHECK (report_type IN ('weekly','monthly')),
  is_enabled boolean NOT NULL DEFAULT true,
  delivery_day integer NOT NULL CHECK (delivery_day BETWEEN 1 AND 31),
  recipient_note text,
  report_scope text NOT NULL DEFAULT 'summary' CHECK (report_scope IN ('summary','summary-and-alerts','full-audit')),
  next_run_date date,
  created_by uuid NOT NULL REFERENCES users(id),
  updated_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_report_schedules_next ON activity_report_schedules(is_enabled,next_run_date);

CREATE TABLE IF NOT EXISTS activity_retention_previews (
  id bigserial PRIMARY KEY,
  event_cutoff date NOT NULL,
  report_cutoff date NOT NULL,
  event_count bigint NOT NULL DEFAULT 0,
  review_count bigint NOT NULL DEFAULT 0,
  alert_case_count bigint NOT NULL DEFAULT 0,
  note text,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_retention_previews_created ON activity_retention_previews(created_at DESC);
