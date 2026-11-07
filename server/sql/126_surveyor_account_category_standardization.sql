-- R65 V28R6: align user account-category and office constraints with the
-- authoritative formal-user profile and the surveyor terminology.
--
-- Historical migrations (including 123_required_initial_users_r55.sql) are
-- intentionally left unchanged. This forward-only migration normalizes the
-- resulting schema/data state.

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_account_category_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_office_role_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_office_scope_check;

-- Do not leave an invalid legacy default under the new role-dependent CHECK.
-- The R65 API and seed paths explicitly populate account_category.
ALTER TABLE users ALTER COLUMN account_category DROP DEFAULT;

UPDATE users
   SET account_category=CASE role
       WHEN 'office-user' THEN 'surveyor'
       WHEN 'office-admin' THEN 'surveyor'
       WHEN 'guest' THEN 'staff-guest'
       WHEN 'validator' THEN 'staff-validator'
       WHEN 'revision-validator' THEN 'staff-validator'
       WHEN 'safety-environment-admin' THEN 'safety-environment-admin'
       WHEN 'safety-environment-director' THEN 'safety-environment-director'
       WHEN 'safety-environment-staff' THEN 'safety-environment-staff'
       ELSE account_category
     END,
       updated_at=now()
 WHERE role IN (
   'office-user','office-admin','guest','validator','revision-validator',
   'safety-environment-admin','safety-environment-director','safety-environment-staff'
 )
 AND account_category IS DISTINCT FROM CASE role
       WHEN 'office-user' THEN 'surveyor'
       WHEN 'office-admin' THEN 'surveyor'
       WHEN 'guest' THEN 'staff-guest'
       WHEN 'validator' THEN 'staff-validator'
       WHEN 'revision-validator' THEN 'staff-validator'
       WHEN 'safety-environment-admin' THEN 'safety-environment-admin'
       WHEN 'safety-environment-director' THEN 'safety-environment-director'
       WHEN 'safety-environment-staff' THEN 'safety-environment-staff'
       ELSE account_category
     END;

ALTER TABLE users
  ADD CONSTRAINT users_account_category_check
  CHECK (
  role IS NOT NULL
  AND account_category IS NOT NULL
  AND (
    (role IN ('office-user','office-admin') AND account_category='surveyor')
    OR (role='guest' AND account_category='staff-guest')
    OR (role IN ('validator','revision-validator') AND account_category='staff-validator')
    OR (role='safety-environment-admin' AND account_category='safety-environment-admin')
    OR (role='safety-environment-director' AND account_category='safety-environment-director')
    OR (role='safety-environment-staff' AND account_category='safety-environment-staff')
  )
);

ALTER TABLE users
  ADD CONSTRAINT users_office_role_check
  CHECK (
  role NOT IN ('office-user','office-admin')
  OR office_id IS NOT NULL
);

ALTER TABLE users
  ADD CONSTRAINT users_office_scope_check
  CHECK (
  role NOT IN ('office-user','office-admin')
  OR office_id IS NOT NULL
);

DO $$
DECLARE
  role_category_mismatch integer;
  office_scope_mismatch integer;
BEGIN
  SELECT count(*) INTO role_category_mismatch
    FROM users
   WHERE role IN (
     'office-user','office-admin','guest','validator','revision-validator',
     'safety-environment-admin','safety-environment-director','safety-environment-staff'
   )
     AND account_category IS DISTINCT FROM CASE role
       WHEN 'office-user' THEN 'surveyor'
       WHEN 'office-admin' THEN 'surveyor'
       WHEN 'guest' THEN 'staff-guest'
       WHEN 'validator' THEN 'staff-validator'
       WHEN 'revision-validator' THEN 'staff-validator'
       WHEN 'safety-environment-admin' THEN 'safety-environment-admin'
       WHEN 'safety-environment-director' THEN 'safety-environment-director'
       WHEN 'safety-environment-staff' THEN 'safety-environment-staff'
       ELSE account_category
     END;

  IF role_category_mismatch<>0 THEN
    RAISE EXCEPTION 'Role/account_category mismatch remains after V28R6 normalization: %',
      role_category_mismatch;
  END IF;

  SELECT count(*) INTO office_scope_mismatch
    FROM users
   WHERE role IN ('office-user','office-admin')
     AND office_id IS NULL;

  IF office_scope_mismatch<>0 THEN
    RAISE EXCEPTION 'Office user/admin without office_id remains after V28R6 normalization: %',
      office_scope_mismatch;
  END IF;
END $$;
