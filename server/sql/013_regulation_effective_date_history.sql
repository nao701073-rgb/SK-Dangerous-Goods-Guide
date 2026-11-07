-- SKDG R65 release CANDIDATE (not production approved).
-- Part 102: publication lineage, immutable metadata snapshots, and effective-date timeline.
-- Uses actual SQL010 tables; does not depend on nonexistent regulation_revisions.
-- This records DB metadata and external file checksums, NOT external file bytes.

CREATE INDEX IF NOT EXISTS idx_regulation_sources_effective_history
  ON regulation_sources (regulation_id, effective_from, effective_to, status);
CREATE INDEX IF NOT EXISTS idx_regulation_publications_effective_history
  ON regulation_publications (regulation_id, effective_from DESC, published_at DESC, id);

-- One effective-date boundary per published regulation; no ambiguous same-day version.
-- Existing collisions must be reconciled before this migration can succeed.
CREATE UNIQUE INDEX IF NOT EXISTS uq_regulation_publications_effective_boundary
  ON regulation_publications (regulation_id, effective_from);

CREATE TABLE IF NOT EXISTS regulation_publication_snapshots (
  publication_id uuid PRIMARY KEY REFERENCES regulation_publications(id) ON DELETE RESTRICT,
  change_set_id uuid NOT NULL REFERENCES regulation_change_sets(id) ON DELETE RESTRICT,
  source_id uuid NOT NULL REFERENCES regulation_sources(id) ON DELETE RESTRICT,
  dataset_id uuid REFERENCES regulation_datasets(id) ON DELETE RESTRICT,
  regulation_id text NOT NULL,
  release_version text NOT NULL,
  effective_from date NOT NULL,
  published_at timestamptz NOT NULL,
  source_document_snapshot jsonb NOT NULL,
  published_dataset_snapshot jsonb NOT NULL,
  change_set_snapshot jsonb NOT NULL,
  source_sha256 text NOT NULL CHECK(source_sha256 ~ '^[0-9a-f]{64}$'),
  dataset_sha256 text CHECK(dataset_sha256 IS NULL OR dataset_sha256 ~ '^[0-9a-f]{64}$'),
  snapshot_origin text NOT NULL DEFAULT 'captured-on-publication'
    CHECK(snapshot_origin IN ('captured-on-publication','legacy-backfill-unverified')),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(source_document_snapshot) = 'object'),
  CHECK (jsonb_typeof(published_dataset_snapshot) = 'object'),
  CHECK (jsonb_typeof(change_set_snapshot) = 'object')
);
CREATE INDEX IF NOT EXISTS idx_regulation_publication_snapshots_lookup
  ON regulation_publication_snapshots(regulation_id, effective_from DESC, publication_id);

-- Older publications cannot be retroactively proven immutable. Preserve their
-- present metadata, but label it unverified so a release gate can block on it.
INSERT INTO regulation_publication_snapshots (
  publication_id, change_set_id, source_id, dataset_id,
  regulation_id, release_version, effective_from, published_at,
  source_document_snapshot, published_dataset_snapshot, change_set_snapshot,
  source_sha256, dataset_sha256, snapshot_origin
)
SELECT p.id, c.id, s.id, d.id,
       p.regulation_id, p.release_version, p.effective_from, p.published_at,
       to_jsonb(s), COALESCE(to_jsonb(d),'{}'::jsonb), to_jsonb(c),
       s.checksum_sha256, d.checksum_sha256, 'legacy-backfill-unverified'
FROM regulation_publications p
JOIN regulation_change_sets c ON c.id = p.change_set_id
JOIN regulation_sources s ON s.id = c.source_id
LEFT JOIN regulation_datasets d ON d.id = c.dataset_id
WHERE NOT EXISTS (
  SELECT 1 FROM regulation_publication_snapshots ss WHERE ss.publication_id = p.id
);

-- Explicitly fail rather than silently accept missing historical metadata.
DO $guard$
BEGIN
 IF EXISTS (
   SELECT 1 FROM regulation_publications p
   LEFT JOIN regulation_publication_snapshots ss ON ss.publication_id = p.id
   WHERE ss.publication_id IS NULL
 ) THEN
   RAISE EXCEPTION 'SKDG regulation history migration: missing publication snapshots';
 END IF;
END
$guard$;

CREATE OR REPLACE FUNCTION skdg_regulation_publication_before_insert()
RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE
 v_previous_id uuid;
 v_source_regulation_id text;
BEGIN
 -- Serialize publication per regulation so concurrent writers cannot create
 -- conflicting effective windows or broken previous-publication chains.
 PERFORM pg_advisory_xact_lock(hashtextextended('skdg:regulation:' || NEW.regulation_id, 0));
 SELECT p.id INTO v_previous_id
 FROM regulation_publications p
 WHERE p.regulation_id=NEW.regulation_id
 ORDER BY p.effective_from DESC, p.published_at DESC, p.id DESC
 LIMIT 1;
 IF EXISTS (
   SELECT 1 FROM regulation_publications p
   WHERE p.regulation_id=NEW.regulation_id
     AND p.effective_from >= NEW.effective_from
 ) THEN
   RAISE EXCEPTION 'SKDG regulation publication must advance effective_from for %', NEW.regulation_id
     USING ERRCODE='23514';
 END IF;
 IF NEW.previous_publication_id IS DISTINCT FROM v_previous_id THEN
   RAISE EXCEPTION 'SKDG regulation publication previous_publication_id mismatch for %', NEW.regulation_id
     USING ERRCODE='23514';
 END IF;
 SELECT s.regulation_id INTO v_source_regulation_id
 FROM regulation_change_sets c JOIN regulation_sources s ON s.id=c.source_id
 WHERE c.id=NEW.change_set_id;
 IF v_source_regulation_id IS NULL OR v_source_regulation_id <> NEW.regulation_id THEN
   RAISE EXCEPTION 'SKDG regulation publication source does not match regulation_id'
     USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END
$fn$;

CREATE OR REPLACE FUNCTION skdg_regulation_publication_capture_snapshot()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
 INSERT INTO regulation_publication_snapshots (
   publication_id,change_set_id,source_id,dataset_id,
   regulation_id,release_version,effective_from,published_at,
   source_document_snapshot,published_dataset_snapshot,change_set_snapshot,
   source_sha256,dataset_sha256,snapshot_origin
 )
 SELECT NEW.id,c.id,s.id,d.id,
        NEW.regulation_id,NEW.release_version,NEW.effective_from,NEW.published_at,
        to_jsonb(s),COALESCE(to_jsonb(d),'{}'::jsonb),to_jsonb(c),
        s.checksum_sha256,d.checksum_sha256,'captured-on-publication'
 FROM regulation_change_sets c
 JOIN regulation_sources s ON s.id=c.source_id
 LEFT JOIN regulation_datasets d ON d.id=c.dataset_id
 WHERE c.id=NEW.change_set_id AND s.regulation_id=NEW.regulation_id;
 IF NOT FOUND THEN
   RAISE EXCEPTION 'SKDG regulation publication snapshot capture failed'
     USING ERRCODE='23514';
 END IF;
 RETURN NULL;
END
$fn$;

CREATE OR REPLACE FUNCTION skdg_regulation_publication_immutable()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
 RAISE EXCEPTION 'SKDG published regulation history is immutable; publish a new revision instead'
   USING ERRCODE='23514';
END
$fn$;

DROP TRIGGER IF EXISTS trg_skdg_regulation_publication_before_insert ON regulation_publications;
CREATE TRIGGER trg_skdg_regulation_publication_before_insert
 BEFORE INSERT ON regulation_publications FOR EACH ROW
 EXECUTE FUNCTION skdg_regulation_publication_before_insert();
DROP TRIGGER IF EXISTS trg_skdg_regulation_publication_capture ON regulation_publications;
CREATE TRIGGER trg_skdg_regulation_publication_capture
 AFTER INSERT ON regulation_publications FOR EACH ROW
 EXECUTE FUNCTION skdg_regulation_publication_capture_snapshot();
DROP TRIGGER IF EXISTS trg_skdg_regulation_publications_immutable ON regulation_publications;
CREATE TRIGGER trg_skdg_regulation_publications_immutable
 BEFORE UPDATE OR DELETE ON regulation_publications FOR EACH ROW
 EXECUTE FUNCTION skdg_regulation_publication_immutable();
DROP TRIGGER IF EXISTS trg_skdg_regulation_snapshots_immutable ON regulation_publication_snapshots;
CREATE TRIGGER trg_skdg_regulation_snapshots_immutable
 BEFORE UPDATE OR DELETE ON regulation_publication_snapshots FOR EACH ROW
 EXECUTE FUNCTION skdg_regulation_publication_immutable();

-- Canonical non-overlapping [from,to) timeline. No extension is needed.
-- Sequential insert guard prevents retroactive editing of published periods.
CREATE OR REPLACE VIEW regulation_publication_effective_history AS
WITH ordered AS (
 SELECT p.id AS publication_id,p.regulation_id,p.release_version,
        p.change_set_id,p.previous_publication_id,p.effective_from,p.published_at,
        lead(p.effective_from) OVER (
          PARTITION BY p.regulation_id ORDER BY p.effective_from,p.published_at,p.id
        ) AS effective_to
 FROM regulation_publications p
)
SELECT o.*,daterange(o.effective_from,o.effective_to,'[)') AS effective_period,
       s.source_id,s.dataset_id,s.source_sha256,s.dataset_sha256,
       s.source_document_snapshot,s.published_dataset_snapshot,s.change_set_snapshot,
       s.snapshot_origin,s.recorded_at
FROM ordered o JOIN regulation_publication_snapshots s ON s.publication_id=o.publication_id;

COMMENT ON VIEW regulation_publication_effective_history IS
 'Immutable metadata snapshots and ordered effective-date windows. Legacy backfills are UNVERIFIED. External object bytes and preview-package lineage are separate release gates.';
