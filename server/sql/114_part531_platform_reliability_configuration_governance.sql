BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS platform_health_snapshots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), environment text NOT NULL CHECK(environment IN ('production','staging','test','development')),
 measured_at timestamptz NOT NULL, p95_response_ms numeric(12,2) NOT NULL CHECK(p95_response_ms>=0), error_rate_percent numeric(8,5) NOT NULL CHECK(error_rate_percent BETWEEN 0 AND 100),
 cpu_percent numeric(8,3) NOT NULL CHECK(cpu_percent BETWEEN 0 AND 100), memory_percent numeric(8,3) NOT NULL CHECK(memory_percent BETWEEN 0 AND 100),
 db_connection_percent numeric(8,3) NOT NULL CHECK(db_connection_percent BETWEEN 0 AND 100), storage_percent numeric(8,3) NOT NULL CHECK(storage_percent BETWEEN 0 AND 100),
 backup_age_hours numeric(10,2) NOT NULL CHECK(backup_age_hours>=0), restore_test_age_days numeric(10,2) NOT NULL CHECK(restore_test_age_days>=0),
 status text NOT NULL CHECK(status IN ('healthy','warning','critical')), blockers jsonb NOT NULL DEFAULT '[]'::jsonb, warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
 evidence_sha256 char(64) NOT NULL CHECK(evidence_sha256 ~ '^[a-f0-9]{64}$'), evidence_reference text NOT NULL, recorded_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_platform_health_env_time ON platform_health_snapshots(environment,measured_at DESC);
CREATE TABLE IF NOT EXISTS configuration_baselines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), environment text NOT NULL CHECK(environment IN ('production','staging','test','development')), component_name text NOT NULL,
 baseline_version text NOT NULL, configuration_sha256 char(64) NOT NULL CHECK(configuration_sha256 ~ '^[a-f0-9]{64}$'), storage_reference text NOT NULL, note text NOT NULL DEFAULT '', active boolean NOT NULL DEFAULT true,
 created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(environment,component_name,baseline_version)
);
CREATE TABLE IF NOT EXISTS configuration_drift_cases (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), baseline_id uuid NOT NULL REFERENCES configuration_baselines(id), title text NOT NULL,
 severity text NOT NULL CHECK(severity IN ('critical','high','medium','low')), detected_at timestamptz NOT NULL, due_at timestamptz NOT NULL,
 description text NOT NULL, remediation_plan text NOT NULL, owner_user_id uuid NOT NULL REFERENCES users(id),
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','investigating','remediating','resolved','verified','closed','cancelled')),
 resolution_note text NOT NULL DEFAULT '', evidence_sha256 char(64), resolved_by uuid REFERENCES users(id), resolved_at timestamptz,
 verified_by uuid REFERENCES users(id), verified_at timestamptz, verification_note text NOT NULL DEFAULT '', created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_configuration_drift_due ON configuration_drift_cases(status,severity,due_at);
CREATE TABLE IF NOT EXISTS reliability_improvement_actions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_type text NOT NULL CHECK(source_type IN ('health','capacity','backup','configuration','security','audit','other')), source_reference text NOT NULL DEFAULT '', title text NOT NULL,
 priority text NOT NULL CHECK(priority IN ('critical','high','medium','low')), description text NOT NULL, success_criteria text NOT NULL, owner_user_id uuid NOT NULL REFERENCES users(id), due_at date NOT NULL,
 status text NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','in-progress','completed','verified','closed','cancelled')), completion_note text NOT NULL DEFAULT '', evidence_sha256 char(64), completed_by uuid REFERENCES users(id), completed_at timestamptz,
 verified_by uuid REFERENCES users(id), verified_at timestamptz, verification_note text NOT NULL DEFAULT '', created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reliability_actions_due ON reliability_improvement_actions(status,priority,due_at);
CREATE TABLE IF NOT EXISTS reliability_review_cycles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), period_start date NOT NULL, period_end date NOT NULL, title text NOT NULL, summary text NOT NULL, decision text NOT NULL DEFAULT '', next_actions text NOT NULL,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','reviewed','approved','returned','cancelled')), snapshot jsonb NOT NULL DEFAULT '{}'::jsonb, snapshot_sha256 char(64),
 created_by uuid NOT NULL REFERENCES users(id), submitted_by uuid REFERENCES users(id), submitted_at timestamptz, reviewed_by uuid REFERENCES users(id), reviewed_at timestamptz, review_note text NOT NULL DEFAULT '', approved_by uuid REFERENCES users(id), approved_at timestamptz, approval_note text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(period_end>=period_start)
);
COMMIT;
