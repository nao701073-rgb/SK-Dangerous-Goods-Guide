BEGIN;

-- Part 503: central attachment storage, immutable correction history,
-- human approval records, and backup operations metadata.

CREATE TABLE IF NOT EXISTS application_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
  parent_document_id uuid REFERENCES application_documents(id) ON DELETE RESTRICT,
  root_document_id uuid REFERENCES application_documents(id) ON DELETE RESTRICT,
  version_number integer NOT NULL DEFAULT 1 CHECK (version_number > 0),
  category text NOT NULL DEFAULT 'other',
  original_name text NOT NULL,
  storage_key text NOT NULL UNIQUE,
  storage_provider text NOT NULL DEFAULT 'filesystem',
  mime_type text NOT NULL,
  file_size bigint NOT NULL CHECK (file_size > 0),
  sha256 text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  description text NOT NULL DEFAULT '',
  change_reason text NOT NULL DEFAULT '',
  uploaded_by_name text NOT NULL DEFAULT '',
  created_by uuid REFERENCES users(id),
  cancelled_by uuid REFERENCES users(id),
  cancelled_at timestamptz,
  cancellation_reason text,
  restored_by uuid REFERENCES users(id),
  restored_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (root_document_id, version_number)
);
CREATE INDEX IF NOT EXISTS idx_application_documents_application
  ON application_documents(application_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_application_documents_root_version
  ON application_documents(root_document_id, version_number DESC);

ALTER TABLE photos ADD COLUMN IF NOT EXISTS storage_provider text NOT NULL DEFAULT 'filesystem';
ALTER TABLE photos ADD COLUMN IF NOT EXISTS storage_key text;
UPDATE photos SET storage_key=stored_name WHERE storage_key IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_photos_storage_key ON photos(storage_key) WHERE storage_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS application_revisions (
  id bigserial PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
  office_id text NOT NULL REFERENCES offices(id),
  revision_number integer NOT NULL,
  action text NOT NULL CHECK (action IN ('create','update','correct','delete','restore')),
  reason text NOT NULL,
  before_data jsonb,
  after_data jsonb,
  changed_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  changed_by uuid REFERENCES users(id),
  changed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(application_id, revision_number)
);
CREATE INDEX IF NOT EXISTS idx_application_revisions_application
  ON application_revisions(application_id, revision_number DESC);
CREATE INDEX IF NOT EXISTS idx_application_revisions_office_time
  ON application_revisions(office_id, changed_at DESC);

CREATE TABLE IF NOT EXISTS regulation_approval_events (
  id bigserial PRIMARY KEY,
  change_set_id uuid NOT NULL REFERENCES regulation_change_sets(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN ('submitted','reviewed','returned','approved','rejected','published','withdrawn')),
  actor_user_id uuid NOT NULL REFERENCES users(id),
  actor_role text NOT NULL,
  comment text NOT NULL DEFAULT '',
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_checksums jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_regulation_approval_events_change_set
  ON regulation_approval_events(change_set_id, created_at DESC);

ALTER TABLE regulation_sources ADD COLUMN IF NOT EXISTS storage_key text;
ALTER TABLE regulation_sources ADD COLUMN IF NOT EXISTS storage_provider text NOT NULL DEFAULT 'filesystem';
ALTER TABLE regulation_datasets ADD COLUMN IF NOT EXISTS storage_key text;
ALTER TABLE regulation_datasets ADD COLUMN IF NOT EXISTS storage_provider text NOT NULL DEFAULT 'filesystem';

ALTER TABLE regulation_change_sets DROP CONSTRAINT IF EXISTS regulation_change_sets_status_check;
ALTER TABLE regulation_change_sets ADD CONSTRAINT regulation_change_sets_status_check
  CHECK(status IN ('draft','submitted','reviewed','returned','approved','published','rejected','withdrawn'));

ALTER TABLE regulation_change_sets
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_comment text,
  ADD COLUMN IF NOT EXISTS publication_block_reason text,
  ADD COLUMN IF NOT EXISTS published_by uuid REFERENCES users(id);

CREATE TABLE IF NOT EXISTS system_backup_settings (
  id text PRIMARY KEY DEFAULT 'default',
  enabled boolean NOT NULL DEFAULT true,
  interval_hours integer NOT NULL DEFAULT 24 CHECK (interval_hours BETWEEN 1 AND 168),
  retention_days integer NOT NULL DEFAULT 30 CHECK (retention_days BETWEEN 7 AND 3650),
  require_offsite_copy boolean NOT NULL DEFAULT true,
  restore_test_interval_days integer NOT NULL DEFAULT 90 CHECK (restore_test_interval_days BETWEEN 7 AND 365),
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO system_backup_settings(id) VALUES('default') ON CONFLICT(id) DO NOTHING;

CREATE TABLE IF NOT EXISTS system_backup_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_id text NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('running','completed','failed','verified')),
  database_file text,
  attachment_file text,
  manifest_file text,
  database_sha256 char(64),
  attachment_sha256 char(64),
  manifest_sha256 char(64),
  storage_location text,
  offsite_location text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  verified_at timestamptz,
  verification_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_by text NOT NULL DEFAULT 'scheduler'
);
CREATE INDEX IF NOT EXISTS idx_system_backup_runs_started
  ON system_backup_runs(started_at DESC);

COMMIT;
