-- Part 99: regulation revision and controlled publication
CREATE TABLE IF NOT EXISTS regulation_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regulation_id text NOT NULL,
  edition_label text NOT NULL,
  publication_date date,
  effective_from date NOT NULL,
  effective_to date,
  language text NOT NULL DEFAULT 'ja',
  publisher text,
  source_url text,
  original_file_name text NOT NULL,
  stored_file_name text NOT NULL,
  mime_type text NOT NULL DEFAULT 'application/pdf',
  file_size bigint NOT NULL CHECK(file_size > 0),
  checksum_sha256 text NOT NULL CHECK(checksum_sha256 ~ '^[0-9a-f]{64}$'),
  status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','source-registered','data-prepared','reviewed','approved','published','superseded','rejected')),
  change_summary text NOT NULL DEFAULT '',
  created_by uuid REFERENCES users(id),
  reviewed_by uuid REFERENCES users(id),
  approved_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  approved_at timestamptz,
  published_at timestamptz,
  UNIQUE(regulation_id, edition_label),
  UNIQUE(checksum_sha256)
);
CREATE INDEX IF NOT EXISTS idx_regulation_sources_lookup ON regulation_sources(regulation_id,effective_from DESC,status);

CREATE TABLE IF NOT EXISTS regulation_datasets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES regulation_sources(id) ON DELETE RESTRICT,
  schema_version text NOT NULL,
  data_format text NOT NULL CHECK(data_format IN ('json','csv')),
  target_keys jsonb NOT NULL DEFAULT '[]'::jsonb,
  original_file_name text NOT NULL,
  stored_file_name text NOT NULL,
  file_size bigint NOT NULL CHECK(file_size > 0),
  checksum_sha256 text NOT NULL CHECK(checksum_sha256 ~ '^[0-9a-f]{64}$'),
  record_count integer,
  validation_status text NOT NULL DEFAULT 'pending' CHECK(validation_status IN ('pending','valid','invalid')),
  validation_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_id, checksum_sha256)
);

CREATE TABLE IF NOT EXISTS regulation_change_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES regulation_sources(id) ON DELETE RESTRICT,
  dataset_id uuid REFERENCES regulation_datasets(id) ON DELETE RESTRICT,
  base_source_id uuid REFERENCES regulation_sources(id) ON DELETE RESTRICT,
  added_count integer NOT NULL DEFAULT 0,
  changed_count integer NOT NULL DEFAULT 0,
  deleted_count integer NOT NULL DEFAULT 0,
  diff_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','reviewed','approved','published','rejected')),
  created_by uuid REFERENCES users(id),
  reviewed_by uuid REFERENCES users(id),
  approved_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

CREATE TABLE IF NOT EXISTS regulation_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_set_id uuid NOT NULL REFERENCES regulation_change_sets(id) ON DELETE RESTRICT,
  regulation_id text NOT NULL,
  effective_from date NOT NULL,
  release_version text NOT NULL,
  previous_publication_id uuid REFERENCES regulation_publications(id),
  rollback_of_publication_id uuid REFERENCES regulation_publications(id),
  published_by uuid REFERENCES users(id),
  published_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(regulation_id, release_version)
);
