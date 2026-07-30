BEGIN;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN (
  'office-user','office-admin','safety-environment-director','safety-environment-staff',
  'safety-environment-admin','guest','validator','revision-validator'
));
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_office_required_check;
ALTER TABLE users ADD CONSTRAINT users_office_required_check CHECK (
  role IN ('safety-environment-director','safety-environment-staff','safety-environment-admin','guest','validator','revision-validator')
  OR office_id IS NOT NULL
);
COMMIT;
