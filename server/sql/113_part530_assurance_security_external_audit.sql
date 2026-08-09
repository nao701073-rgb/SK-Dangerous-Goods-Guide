BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS assurance_retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), record_type text NOT NULL UNIQUE,
  retention_days integer NOT NULL CHECK(retention_days>=30), disposition text NOT NULL CHECK(disposition IN ('archive-then-dispose','retain-only','legal-hold')),
  owner_role text NOT NULL, active boolean NOT NULL DEFAULT true, note text NOT NULL DEFAULT '', created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS assurance_archive_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), policy_id uuid NOT NULL REFERENCES assurance_retention_policies(id), title text NOT NULL,
  period_start date NOT NULL, period_end date NOT NULL, record_count integer NOT NULL CHECK(record_count>=0), storage_reference text NOT NULL,
  manifest_sha256 char(64) NOT NULL CHECK(manifest_sha256 ~ '^[a-f0-9]{64}$'), legal_hold boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'archived' CHECK(status IN ('planned','archived','verified','failed','cancelled')),
  created_by uuid NOT NULL REFERENCES users(id), verified_by uuid REFERENCES users(id), verified_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(period_end>=period_start)
);
CREATE TABLE IF NOT EXISTS assurance_disposal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), archive_batch_id uuid NOT NULL REFERENCES assurance_archive_batches(id), title text NOT NULL,
  due_at date NOT NULL, reason text NOT NULL, legal_hold boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','reviewed','executed','verified','returned','cancelled')),
  created_by uuid NOT NULL REFERENCES users(id), reviewed_by uuid REFERENCES users(id), reviewed_at timestamptz,
  executed_by uuid REFERENCES users(id), executed_at timestamptz, execution_note text NOT NULL DEFAULT '', execution_sha256 char(64),
  verified_by uuid REFERENCES users(id), verified_at timestamptz, verification_note text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS security_vulnerability_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), external_id text UNIQUE, asset_name text NOT NULL, component_name text NOT NULL DEFAULT '', title text NOT NULL,
  severity text NOT NULL CHECK(severity IN ('critical','high','medium','low')), cvss numeric(3,1) CHECK(cvss BETWEEN 0 AND 10), detected_at timestamptz NOT NULL,
  due_at timestamptz NOT NULL, source text NOT NULL DEFAULT '', affected_version text NOT NULL DEFAULT '', fixed_version text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','investigating','mitigating','mitigated','accepted','closed','cancelled')),
  owner_user_id uuid NOT NULL REFERENCES users(id), mitigation_plan text NOT NULL, resolution_note text NOT NULL DEFAULT '', evidence_sha256 char(64),
  risk_acceptance_reason text NOT NULL DEFAULT '', risk_acceptance_expires_at timestamptz,
  created_by uuid NOT NULL REFERENCES users(id), mitigated_by uuid REFERENCES users(id), mitigated_at timestamptz, verified_by uuid REFERENCES users(id), verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_security_vulnerability_status_due ON security_vulnerability_cases(status,severity,due_at);

CREATE TABLE IF NOT EXISTS external_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, audit_type text NOT NULL CHECK(audit_type IN ('external','customer','certification','regulatory')),
  auditor_organization text NOT NULL, scope text NOT NULL, period_start date NOT NULL, period_end date NOT NULL, due_at date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','reviewed','approved','returned','closed','cancelled')),
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb, snapshot_sha256 char(64), created_by uuid NOT NULL REFERENCES users(id), submitted_by uuid REFERENCES users(id), submitted_at timestamptz,
  reviewed_by uuid REFERENCES users(id), reviewed_at timestamptz, review_note text NOT NULL DEFAULT '', approved_by uuid REFERENCES users(id), approved_at timestamptz, approval_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(period_end>=period_start)
);
CREATE TABLE IF NOT EXISTS external_audit_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), audit_id uuid NOT NULL REFERENCES external_audits(id) ON DELETE CASCADE, title text NOT NULL,
  classification text NOT NULL CHECK(classification IN ('public','internal','confidential','restricted')), storage_reference text NOT NULL,
  sha256 char(64) NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'), note text NOT NULL DEFAULT '', prepared_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS external_audit_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), audit_id uuid NOT NULL REFERENCES external_audits(id) ON DELETE CASCADE, title text NOT NULL,
  severity text NOT NULL CHECK(severity IN ('critical','high','medium','low')), description text NOT NULL, corrective_plan text NOT NULL,
  owner_user_id uuid NOT NULL REFERENCES users(id), due_at date NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','in-progress','resolved','verified','closed','cancelled')),
  resolution_note text NOT NULL DEFAULT '', evidence_sha256 char(64), resolved_by uuid REFERENCES users(id), resolved_at timestamptz,
  verified_by uuid REFERENCES users(id), verified_at timestamptz, verification_note text NOT NULL DEFAULT '', created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_external_audit_findings_due ON external_audit_findings(status,severity,due_at);
COMMIT;
