BEGIN;
CREATE TABLE IF NOT EXISTS application_intake_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id uuid NOT NULL REFERENCES offices(id),
  application_id uuid REFERENCES applications(id),
  source_label text NOT NULL,
  source_format text NOT NULL CHECK(source_format IN('xls','xlsx','csv')),
  source_sha256 text NOT NULL CHECK(source_sha256~'^[a-f0-9]{64}$'),
  source_size_bytes bigint NOT NULL DEFAULT 0 CHECK(source_size_bytes>=0 AND source_size_bytes<=104857600),
  original_file_stored boolean NOT NULL DEFAULT false CHECK(original_file_stored=false),
  imported_at timestamptz NOT NULL,
  cargo_count integer NOT NULL CHECK(cargo_count>=0),
  validation_status text NOT NULL CHECK(validation_status IN('ready','review','blocked')),
  blocker_count integer NOT NULL DEFAULT 0 CHECK(blocker_count>=0),
  warning_count integer NOT NULL DEFAULT 0 CHECK(warning_count>=0),
  validation_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'imported' CHECK(status IN('imported','reviewed','registered','updated','returned','cancelled')),
  created_by uuid NOT NULL REFERENCES users(id),
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  review_note text NOT NULL DEFAULT '',
  registered_by uuid REFERENCES users(id),
  registered_at timestamptz,
  registration_note text NOT NULL DEFAULT '',
  snapshot jsonb,
  snapshot_sha256 text CHECK(snapshot_sha256 IS NULL OR snapshot_sha256~'^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS application_intake_office_idx ON application_intake_workflows(office_id,created_at DESC);
CREATE INDEX IF NOT EXISTS application_intake_application_idx ON application_intake_workflows(application_id,created_at DESC);
COMMENT ON TABLE application_intake_workflows IS 'Application/request intake audit metadata. Original files and raw cell bodies are never stored.';
COMMIT;
