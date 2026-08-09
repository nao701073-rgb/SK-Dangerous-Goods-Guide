-- Part 529: common application case information shared by application management and CTU securing calculation.
BEGIN;

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS case_data jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE applications
  DROP CONSTRAINT IF EXISTS chk_applications_case_data_object;

ALTER TABLE applications
  ADD CONSTRAINT chk_applications_case_data_object
  CHECK (jsonb_typeof(case_data) = 'object');

CREATE INDEX IF NOT EXISTS idx_applications_case_data_gin
  ON applications USING gin (case_data jsonb_path_ops);

COMMENT ON COLUMN applications.case_data IS
  'Common case data: applicant, shipper, loading/discharge ports, container type and dangerous-goods cargo items. Do not store file bodies or secret values.';

COMMIT;
