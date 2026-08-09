BEGIN;

-- Part 510: backup verification, isolated restore drills, full-system migration drills,
-- atomic cutover and rollback evidence.

CREATE TABLE IF NOT EXISTS system_recovery_settings (
  id text PRIMARY KEY DEFAULT 'default',
  rpo_minutes integer NOT NULL DEFAULT 1440 CHECK (rpo_minutes BETWEEN 5 AND 10080),
  rto_minutes integer NOT NULL DEFAULT 240 CHECK (rto_minutes BETWEEN 15 AND 10080),
  backup_verification_interval_days integer NOT NULL DEFAULT 7 CHECK (backup_verification_interval_days BETWEEN 1 AND 365),
  restore_drill_interval_days integer NOT NULL DEFAULT 90 CHECK (restore_drill_interval_days BETWEEN 7 AND 730),
  migration_drill_interval_days integer NOT NULL DEFAULT 180 CHECK (migration_drill_interval_days BETWEEN 14 AND 730),
  require_offsite_copy boolean NOT NULL DEFAULT true,
  require_isolated_restore boolean NOT NULL DEFAULT true,
  require_rollback_test boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO system_recovery_settings(id) VALUES('default') ON CONFLICT(id) DO NOTHING;

ALTER TABLE system_backup_runs
  ADD COLUMN IF NOT EXISTS release_file text,
  ADD COLUMN IF NOT EXISTS release_sha256 char(64),
  ADD COLUMN IF NOT EXISTS release_version text,
  ADD COLUMN IF NOT EXISTS row_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS file_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS verification_level text NOT NULL DEFAULT 'not-verified',
  ADD COLUMN IF NOT EXISTS last_drill_id uuid;

CREATE TABLE IF NOT EXISTS system_recovery_drills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drill_type text NOT NULL CHECK (drill_type IN ('backup-verification','isolated-restore','full-migration','cutover','rollback')),
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','running','passed','warning','failed','cancelled')),
  backup_run_id uuid REFERENCES system_backup_runs(id) ON DELETE SET NULL,
  migration_run_id uuid REFERENCES system_migration_runs(id) ON DELETE SET NULL,
  source_release text,
  target_release text,
  source_environment text,
  target_environment text,
  started_at timestamptz,
  completed_at timestamptz,
  rpo_minutes_observed integer,
  rto_minutes_observed integer,
  expected_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  actual_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  integrity_checks jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text NOT NULL DEFAULT '',
  failure_reason text,
  executed_by uuid REFERENCES users(id),
  witnessed_by uuid REFERENCES users(id),
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_system_recovery_drills_type_time ON system_recovery_drills(drill_type,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_recovery_drills_status ON system_recovery_drills(status,created_at DESC);

CREATE TABLE IF NOT EXISTS system_release_activations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activation_id text NOT NULL UNIQUE,
  previous_release text,
  target_release text NOT NULL,
  stage_path text,
  active_path text,
  status text NOT NULL CHECK (status IN ('planned','validated','activated','rolled-back','failed')),
  preflight_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  post_activation_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  rollback_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  activated_by uuid REFERENCES users(id),
  activated_at timestamptz,
  rolled_back_by uuid REFERENCES users(id),
  rolled_back_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_system_release_activations_created ON system_release_activations(created_at DESC);

CREATE TABLE IF NOT EXISTS system_recovery_evidence (
  id bigserial PRIMARY KEY,
  drill_id uuid NOT NULL REFERENCES system_recovery_drills(id) ON DELETE CASCADE,
  evidence_type text NOT NULL CHECK (evidence_type IN ('report','checksum','log','screenshot','approval','other')),
  evidence_reference text NOT NULL,
  sha256 char(64),
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_system_recovery_evidence_drill ON system_recovery_evidence(drill_id,created_at);

DO $$ BEGIN
  ALTER TABLE system_backup_runs
    ADD CONSTRAINT fk_system_backup_runs_last_drill
    FOREIGN KEY(last_drill_id) REFERENCES system_recovery_drills(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;
