-- Part 92: initial release authentication policy.
-- Administrator assigns login ID and initial password. Email/MFA remain future options.
-- Security: do not downgrade existing MFA or mandatory password-change flags.
-- Corporate IdP/MFA policy and forward-only existing-DB upgrades require separate approval.
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
