BEGIN;

CREATE TABLE IF NOT EXISTS quality_rule_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL CHECK (domain IN ('dangerous-goods-master','domestic-law','code-mapping','application-case','ctu-link','attachment-metadata','other')),
  executed_at timestamptz NOT NULL,
  rule_set_version text NOT NULL,
  evaluated_count integer NOT NULL CHECK (evaluated_count>=0),
  violation_count integer NOT NULL CHECK (violation_count>=0),
  critical_violation_count integer NOT NULL CHECK (critical_violation_count>=0),
  auto_fix_candidate_count integer NOT NULL CHECK (auto_fix_candidate_count>=0),
  manual_review_count integer NOT NULL CHECK (manual_review_count>=0),
  false_positive_percent numeric(7,4) NOT NULL CHECK (false_positive_percent BETWEEN 0 AND 100),
  violation_rate numeric(9,4) NOT NULL CHECK (violation_rate>=0),
  status text NOT NULL CHECK (status IN ('healthy','warning','critical')),
  blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_reference text NOT NULL,
  evidence_sha256 text NOT NULL CHECK (evidence_sha256 ~ '^[a-f0-9]{64}$'),
  recorded_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quality_correction_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_run_id uuid REFERENCES quality_rule_runs(id),
  rule_id text NOT NULL,
  domain text NOT NULL CHECK (domain IN ('dangerous-goods-master','domestic-law','code-mapping','application-case','ctu-link','attachment-metadata','other')),
  entity_reference text NOT NULL,
  field_name text NOT NULL,
  current_value_sha256 text NOT NULL CHECK (current_value_sha256 ~ '^[a-f0-9]{64}$'),
  proposed_value_sha256 text NOT NULL CHECK (proposed_value_sha256 ~ '^[a-f0-9]{64}$'),
  severity text NOT NULL CHECK (severity IN ('critical','high','medium','low')),
  confidence_percent numeric(7,4) NOT NULL CHECK (confidence_percent BETWEEN 0 AND 100),
  rationale text NOT NULL,
  owner_user_id uuid NOT NULL REFERENCES users(id),
  detected_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','rejected','applied','verified','cancelled')),
  created_by uuid NOT NULL REFERENCES users(id),
  reviewed_by uuid REFERENCES users(id), reviewed_at timestamptz, review_note text NOT NULL DEFAULT '',
  applied_by uuid REFERENCES users(id), applied_at timestamptz, application_note text NOT NULL DEFAULT '', application_evidence_sha256 text CHECK (application_evidence_sha256 IS NULL OR application_evidence_sha256 ~ '^[a-f0-9]{64}$'),
  verified_by uuid REFERENCES users(id), verified_at timestamptz, verification_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (current_value_sha256 <> proposed_value_sha256)
);

CREATE TABLE IF NOT EXISTS change_impact_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_type text NOT NULL CHECK (change_type IN ('application','database','master-data','regulation','configuration','security','mixed')),
  source_release text NOT NULL,
  target_release text NOT NULL,
  analyzed_at timestamptz NOT NULL,
  changed_file_count integer NOT NULL CHECK (changed_file_count>=0),
  changed_table_count integer NOT NULL CHECK (changed_table_count>=0),
  impacted_components jsonb NOT NULL DEFAULT '[]'::jsonb,
  regression_targets jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_level text NOT NULL CHECK (risk_level IN ('critical','high','medium','low')),
  summary text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','reviewed','returned','approved','cancelled')),
  evidence_reference text NOT NULL,
  evidence_sha256 text NOT NULL CHECK (evidence_sha256 ~ '^[a-f0-9]{64}$'),
  created_by uuid NOT NULL REFERENCES users(id),
  reviewed_by uuid REFERENCES users(id), reviewed_at timestamptz, review_note text NOT NULL DEFAULT '',
  approved_by uuid REFERENCES users(id), approved_at timestamptz, approval_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (source_release <> target_release)
);

CREATE TABLE IF NOT EXISTS release_governance_defects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_name text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('critical','high','medium','low')),
  title text NOT NULL,
  description text NOT NULL,
  detected_at timestamptz NOT NULL,
  due_at timestamptz NOT NULL,
  owner_user_id uuid NOT NULL REFERENCES users(id),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','verified','closed','cancelled')),
  resolution_note text NOT NULL DEFAULT '', evidence_sha256 text CHECK (evidence_sha256 IS NULL OR evidence_sha256 ~ '^[a-f0-9]{64}$'),
  resolved_by uuid REFERENCES users(id), resolved_at timestamptz,
  verified_by uuid REFERENCES users(id), verified_at timestamptz, verification_note text NOT NULL DEFAULT '',
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS release_distribution_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_name text NOT NULL UNIQUE,
  base_release text NOT NULL,
  release_summary text NOT NULL,
  package_sha256 text NOT NULL CHECK (package_sha256 ~ '^[a-f0-9]{64}$'),
  rollback_package_sha256 text NOT NULL CHECK (rollback_package_sha256 ~ '^[a-f0-9]{64}$'),
  evidence_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','reviewed','returned','approved','published','verified','cancelled')),
  snapshot jsonb,
  snapshot_sha256 text CHECK (snapshot_sha256 IS NULL OR snapshot_sha256 ~ '^[a-f0-9]{64}$'),
  created_by uuid NOT NULL REFERENCES users(id),
  submitted_by uuid REFERENCES users(id), submitted_at timestamptz,
  reviewed_by uuid REFERENCES users(id), reviewed_at timestamptz, review_note text NOT NULL DEFAULT '',
  approved_by uuid REFERENCES users(id), approved_at timestamptz, approval_note text NOT NULL DEFAULT '',
  published_by uuid REFERENCES users(id), published_at timestamptz, distribution_reference text NOT NULL DEFAULT '',
  verified_by uuid REFERENCES users(id), verified_at timestamptz, verification_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (release_name <> base_release), CHECK (package_sha256 <> rollback_package_sha256)
);

CREATE INDEX IF NOT EXISTS quality_rule_runs_executed_idx ON quality_rule_runs(executed_at DESC,domain);
CREATE INDEX IF NOT EXISTS quality_correction_status_idx ON quality_correction_candidates(status,severity,detected_at);
CREATE INDEX IF NOT EXISTS change_impact_status_idx ON change_impact_analyses(status,analyzed_at DESC);
CREATE INDEX IF NOT EXISTS release_defects_status_idx ON release_governance_defects(release_name,status,severity,due_at);
CREATE INDEX IF NOT EXISTS release_candidates_status_idx ON release_distribution_candidates(status,created_at DESC);

COMMIT;
