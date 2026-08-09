-- Part 508: item-level legal source verification, human approval and publication control.

CREATE TABLE IF NOT EXISTS regulation_verification_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL CHECK (target_type IN ('regulation','code','dangerous-good-criteria','reference-link')),
  target_key text NOT NULL,
  display_label text NOT NULL,
  regulation_id text,
  source_edition text,
  source_page_references jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_checksum_sha256 text,
  content_checksum_sha256 text NOT NULL CHECK (content_checksum_sha256 ~ '^[0-9a-f]{64}$'),
  status text NOT NULL DEFAULT 'unverified' CHECK (status IN ('unverified','prepared','submitted','source-verified','returned','approved','amendment-pending','suspended')),
  verification_checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  verification_note text NOT NULL DEFAULT '',
  approval_note text NOT NULL DEFAULT '',
  publication_block_reason text,
  prepared_by uuid REFERENCES users(id),
  submitted_by uuid REFERENCES users(id),
  verified_by uuid REFERENCES users(id),
  approved_by uuid REFERENCES users(id),
  prepared_at timestamptz,
  submitted_at timestamptz,
  verified_at timestamptz,
  approved_at timestamptz,
  last_source_checked_at timestamptz,
  next_review_due date,
  revision_number integer NOT NULL DEFAULT 1 CHECK (revision_number > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(target_type,target_key),
  CHECK (verified_by IS NULL OR prepared_by IS NULL OR verified_by <> prepared_by),
  CHECK (approved_by IS NULL OR prepared_by IS NULL OR approved_by <> prepared_by),
  CHECK (approved_by IS NULL OR verified_by IS NULL OR approved_by <> verified_by)
);
CREATE INDEX IF NOT EXISTS idx_regulation_verification_items_status_type
  ON regulation_verification_items(status,target_type,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_regulation_verification_items_regulation
  ON regulation_verification_items(regulation_id,status);
CREATE INDEX IF NOT EXISTS idx_regulation_verification_items_review_due
  ON regulation_verification_items(next_review_due) WHERE status='approved';

CREATE TABLE IF NOT EXISTS regulation_verification_events (
  id bigserial PRIMARY KEY,
  item_id uuid NOT NULL REFERENCES regulation_verification_items(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN ('catalog-created','catalog-updated','prepared','submitted','source-verified','returned','approved','amendment-pending','suspended','restored')),
  actor_user_id uuid REFERENCES users(id),
  actor_role text,
  comment text NOT NULL DEFAULT '',
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_page_references jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_checksum_sha256 text,
  content_checksum_sha256 text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_regulation_verification_events_item
  ON regulation_verification_events(item_id,created_at DESC);

CREATE TABLE IF NOT EXISTS regulation_approval_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES regulation_verification_items(id) ON DELETE RESTRICT,
  certificate_number text NOT NULL UNIQUE,
  revision_number integer NOT NULL,
  target_type text NOT NULL,
  target_key text NOT NULL,
  display_label text NOT NULL,
  source_edition text,
  source_page_references jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_checksum_sha256 text,
  content_checksum_sha256 text NOT NULL,
  verification_checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  verified_by uuid NOT NULL REFERENCES users(id),
  verified_at timestamptz NOT NULL,
  approved_by uuid NOT NULL REFERENCES users(id),
  approved_at timestamptz NOT NULL DEFAULT now(),
  valid_from date NOT NULL DEFAULT current_date,
  valid_to date,
  status text NOT NULL DEFAULT 'valid' CHECK (status IN ('valid','superseded','suspended','revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(item_id,revision_number)
);
CREATE INDEX IF NOT EXISTS idx_regulation_approval_certificates_target
  ON regulation_approval_certificates(target_type,target_key,status);

CREATE TABLE IF NOT EXISTS regulation_catalog_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_release text NOT NULL,
  source_master_version text,
  expected_dangerous_goods integer NOT NULL DEFAULT 0,
  expected_codes integer NOT NULL DEFAULT 0,
  expected_regulations integer NOT NULL DEFAULT 0,
  inserted_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  amendment_pending_count integer NOT NULL DEFAULT 0,
  unchanged_count integer NOT NULL DEFAULT 0,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  executed_by uuid REFERENCES users(id),
  executed_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE VIEW regulation_verification_summary AS
SELECT
  count(*)::int AS total,
  count(*) FILTER (WHERE status='approved')::int AS approved,
  count(*) FILTER (WHERE status='source-verified')::int AS source_verified,
  count(*) FILTER (WHERE status='submitted')::int AS submitted,
  count(*) FILTER (WHERE status IN ('unverified','prepared','returned'))::int AS pending,
  count(*) FILTER (WHERE status='amendment-pending')::int AS amendment_pending,
  count(*) FILTER (WHERE status='suspended')::int AS suspended,
  count(*) FILTER (WHERE target_type='dangerous-good-criteria')::int AS dangerous_goods,
  count(*) FILTER (WHERE target_type='code')::int AS codes,
  count(*) FILTER (WHERE target_type='regulation')::int AS regulations,
  count(*) FILTER (WHERE status='approved' AND next_review_due IS NOT NULL AND next_review_due < current_date)::int AS review_overdue
FROM regulation_verification_items;
