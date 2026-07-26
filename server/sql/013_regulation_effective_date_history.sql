-- Part 102: effective-date and historical version controls
ALTER TABLE regulation_revisions ADD COLUMN IF NOT EXISTS effective_to date;
ALTER TABLE regulation_revisions ADD COLUMN IF NOT EXISTS published_dataset_snapshot jsonb;
ALTER TABLE regulation_revisions ADD COLUMN IF NOT EXISTS supersedes_revision_id text;
CREATE INDEX IF NOT EXISTS idx_regulation_revisions_asof ON regulation_revisions (regulation_id, effective_from, effective_to, status);
-- PostgreSQL exclusion constraint should be enabled after btree_gist is approved by infrastructure.
-- It prevents overlapping dateranges for published/approved revisions of the same regulation.
