-- Part 191: Safety and Environment Office roles and organization scope.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN (
  'office-user','office-admin','safety-environment-director','safety-environment-staff',
  'safety-environment-admin','guest','validator'
));

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_check;
ALTER TABLE users ADD CONSTRAINT users_office_scope_check CHECK (
  role IN ('safety-environment-director','safety-environment-staff','safety-environment-admin','guest','validator')
  OR office_id IS NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_safety_environment_roles
  ON users(role, active, display_name)
  WHERE role IN ('safety-environment-director','safety-environment-staff','safety-environment-admin');
