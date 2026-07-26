ALTER TABLE photos ADD COLUMN IF NOT EXISTS representative boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_photos_representative ON photos(application_id, representative) WHERE deleted_at IS NULL AND representative=true;
ALTER TABLE applications ALTER COLUMN status SET DEFAULT 'active';
