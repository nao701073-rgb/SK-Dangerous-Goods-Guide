BEGIN;

CREATE TABLE IF NOT EXISTS backup_verification_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_date date NOT NULL,
  database_backup_ok boolean NOT NULL DEFAULT false,
  photo_backup_ok boolean NOT NULL DEFAULT false,
  restore_test_ok boolean NOT NULL DEFAULT false,
  retention_ok boolean NOT NULL DEFAULT false,
  evidence_note text,
  verified_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_backup_verification_records_date ON backup_verification_records(verification_date DESC,created_at DESC);

CREATE TABLE IF NOT EXISTS production_operation_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision text NOT NULL CHECK(decision IN ('hold','pilot-ready','production-ready')),
  target_user_count integer NOT NULL DEFAULT 50 CHECK(target_user_count BETWEEN 1 AND 500),
  readiness_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  decision_note text,
  decided_by uuid REFERENCES users(id),
  decided_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_production_operation_decisions_date ON production_operation_decisions(decided_at DESC);

ALTER TABLE account_invitations ADD COLUMN IF NOT EXISTS invitation_token_hash text;
ALTER TABLE account_invitations ADD COLUMN IF NOT EXISTS last_error text;

COMMIT;
