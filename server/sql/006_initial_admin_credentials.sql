-- Part 92: initial release authentication policy
-- Administrator assigns login ID and initial password. Email/MFA remain future options.
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ALTER COLUMN mfa_required SET DEFAULT false;
UPDATE users SET mfa_required=false WHERE mfa_required=true;
UPDATE users SET must_change_password=false WHERE must_change_password=true;
