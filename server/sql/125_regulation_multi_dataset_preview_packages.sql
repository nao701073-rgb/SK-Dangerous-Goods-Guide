-- R65 internal candidate: multi-dataset legal amendment preview package
-- Adds a package layer without changing the existing single-dataset regulation workflow.

CREATE TABLE IF NOT EXISTS regulation_preview_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES regulation_sources(id) ON DELETE RESTRICT,
  package_title text NOT NULL DEFAULT '',
  edition_label text NOT NULL DEFAULT '',
  effective_from date,
  schema_version text NOT NULL DEFAULT '1.0',
  datasets jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_page_references jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  candidate_note text NOT NULL DEFAULT '',
  payload_sha256 text,
  status text NOT NULL DEFAULT 'draft' CHECK(status IN (
    'draft','submitted','candidate-verified','returned',
    'preview','preview-verified','preview-returned',
    'safety-confirmed','production-approved','published','rejected'
  )),
  prepared_by uuid REFERENCES users(id),
  submitted_by uuid REFERENCES users(id),
  candidate_verified_by uuid REFERENCES users(id),
  preview_sent_by uuid REFERENCES users(id),
  preview_verified_by uuid REFERENCES users(id),
  safety_confirmed_by uuid REFERENCES users(id),
  production_approved_by uuid REFERENCES users(id),
  published_by uuid REFERENCES users(id),
  returned_by uuid REFERENCES users(id),
  return_reason text,
  release_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  candidate_verified_at timestamptz,
  preview_sent_at timestamptz,
  preview_verified_at timestamptz,
  safety_confirmed_at timestamptz,
  production_approved_at timestamptz,
  published_at timestamptz,
  CHECK (jsonb_typeof(datasets) = 'array'),
  CHECK (jsonb_typeof(source_page_references) = 'array'),
  CHECK (jsonb_typeof(confidence_metadata) = 'object'),
  CHECK (payload_sha256 IS NULL OR payload_sha256 ~ '^[0-9a-f]{64}$')
);

CREATE INDEX IF NOT EXISTS idx_regulation_preview_packages_status
  ON regulation_preview_packages(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_regulation_preview_packages_source
  ON regulation_preview_packages(source_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_regulation_preview_packages_published
  ON regulation_preview_packages(published_at DESC)
  WHERE status='published';

CREATE TABLE IF NOT EXISTS regulation_preview_package_events (
  id bigserial PRIMARY KEY,
  package_id uuid NOT NULL REFERENCES regulation_preview_packages(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_user_id uuid REFERENCES users(id),
  actor_role text,
  comment text NOT NULL DEFAULT '',
  payload_sha256 text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (payload_sha256 IS NULL OR payload_sha256 ~ '^[0-9a-f]{64}$'),
  CHECK (jsonb_typeof(details) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_regulation_preview_package_events_package
  ON regulation_preview_package_events(package_id, created_at, id);


-- Once published, a multi-dataset preview package and its released payload
-- must not be updated/deleted. Corrections require another published package.
CREATE OR REPLACE FUNCTION skdg_regulation_published_package_protect()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
 IF OLD.status='published' THEN
   RAISE EXCEPTION 'SKDG published preview package is immutable; publish a new package'
     USING ERRCODE='23514';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END
$fn$;
DROP TRIGGER IF EXISTS trg_skdg_regulation_published_package_protect ON regulation_preview_packages;
CREATE TRIGGER trg_skdg_regulation_published_package_protect
 BEFORE UPDATE OR DELETE ON regulation_preview_packages FOR EACH ROW
 EXECUTE FUNCTION skdg_regulation_published_package_protect();
