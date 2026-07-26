-- Part 100: source-page evidence and approval controls
ALTER TABLE regulation_change_sets
  ADD COLUMN IF NOT EXISTS update_type text NOT NULL DEFAULT 'amendment'
    CHECK(update_type IN ('amendment','new-edition','correction','translation-update')),
  ADD COLUMN IF NOT EXISTS record_key text,
  ADD COLUMN IF NOT EXISTS review_checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS source_page_references jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS deletion_justification text,
  ADD COLUMN IF NOT EXISTS expected_maximum_deletion_count integer NOT NULL DEFAULT 0 CHECK(expected_maximum_deletion_count >= 0);

ALTER TABLE regulation_change_sets
  ADD COLUMN IF NOT EXISTS diff_checksum_sha256 text;

CREATE INDEX IF NOT EXISTS idx_regulation_change_sets_status_created
  ON regulation_change_sets(status, created_at DESC);
