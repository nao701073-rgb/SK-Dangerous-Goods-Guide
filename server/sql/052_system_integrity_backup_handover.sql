BEGIN;

CREATE TABLE IF NOT EXISTS system_integrity_diagnoses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id text,
  diagnosed_by text NOT NULL,
  diagnosed_at timestamptz NOT NULL DEFAULT now(),
  critical_count integer NOT NULL DEFAULT 0,
  warning_count integer NOT NULL DEFAULT 0,
  passed_count integer NOT NULL DEFAULT 0,
  storage_bytes bigint NOT NULL DEFAULT 0,
  report jsonb NOT NULL,
  verification_hash char(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS system_backup_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_id text NOT NULL UNIQUE,
  office_id text,
  label text,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL,
  payload_hash char(64) NOT NULL,
  verification_hash char(64) NOT NULL,
  item_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  storage_location text,
  restore_tested_at timestamptz,
  restore_tested_by text,
  restore_test_result text CHECK (restore_test_result IN ('passed','failed'))
);

CREATE TABLE IF NOT EXISTS system_restore_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_id text NOT NULL,
  office_id text,
  restored_by text NOT NULL,
  restored_at timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL,
  result text NOT NULL CHECK (result IN ('completed','failed','cancelled')),
  before_backup_id text,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_system_integrity_diagnoses_office_time ON system_integrity_diagnoses (office_id, diagnosed_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_backup_ledger_office_time ON system_backup_ledger (office_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_restore_history_office_time ON system_restore_history (office_id, restored_at DESC);

COMMIT;
