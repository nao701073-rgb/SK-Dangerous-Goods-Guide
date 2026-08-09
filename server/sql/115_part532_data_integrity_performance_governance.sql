BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS data_performance_snapshots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 environment text NOT NULL CHECK(environment IN ('production','staging','test','development')),
 measured_at timestamptz NOT NULL,
 query_p95_ms numeric(12,2) NOT NULL CHECK(query_p95_ms >= 0),
 search_p95_ms numeric(12,2) NOT NULL CHECK(search_p95_ms >= 0),
 failed_query_percent numeric(8,5) NOT NULL CHECK(failed_query_percent BETWEEN 0 AND 100),
 cache_hit_percent numeric(8,5) NOT NULL CHECK(cache_hit_percent BETWEEN 0 AND 100),
 connection_use_percent numeric(8,5) NOT NULL CHECK(connection_use_percent BETWEEN 0 AND 100),
 index_bloat_percent numeric(8,5) NOT NULL CHECK(index_bloat_percent BETWEEN 0 AND 100),
 no_result_percent numeric(8,5) NOT NULL CHECK(no_result_percent BETWEEN 0 AND 100),
 indexed_record_count integer NOT NULL CHECK(indexed_record_count >= 0),
 indexed_unique_un_count integer NOT NULL CHECK(indexed_unique_un_count >= 0),
 status text NOT NULL CHECK(status IN ('healthy','warning','critical')),
 blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
 warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
 evidence_reference text NOT NULL,
 evidence_sha256 char(64) NOT NULL CHECK(evidence_sha256 ~ '^[a-f0-9]{64}$'),
 recorded_by uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_data_performance_env_time ON data_performance_snapshots(environment, measured_at DESC);

CREATE TABLE IF NOT EXISTS attachment_integrity_snapshots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 environment text NOT NULL CHECK(environment IN ('production','staging','test','development')),
 measured_at timestamptz NOT NULL,
 total_files integer NOT NULL CHECK(total_files >= 0),
 linked_files integer NOT NULL CHECK(linked_files >= 0),
 orphaned_files integer NOT NULL CHECK(orphaned_files >= 0),
 missing_files integer NOT NULL CHECK(missing_files >= 0),
 hash_mismatch_files integer NOT NULL CHECK(hash_mismatch_files >= 0),
 malware_pending_files integer NOT NULL CHECK(malware_pending_files >= 0),
 malware_failed_files integer NOT NULL CHECK(malware_failed_files >= 0),
 metadata_mismatch_files integer NOT NULL CHECK(metadata_mismatch_files >= 0),
 quarantined_files integer NOT NULL CHECK(quarantined_files >= 0),
 status text NOT NULL CHECK(status IN ('healthy','warning','critical')),
 blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
 warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
 evidence_reference text NOT NULL,
 evidence_sha256 char(64) NOT NULL CHECK(evidence_sha256 ~ '^[a-f0-9]{64}$'),
 recorded_by uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_attachment_integrity_env_time ON attachment_integrity_snapshots(environment, measured_at DESC);

CREATE TABLE IF NOT EXISTS cross_data_integrity_snapshots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 environment text NOT NULL CHECK(environment IN ('production','staging','test','development')),
 measured_at timestamptz NOT NULL,
 application_count integer NOT NULL CHECK(application_count >= 0),
 duplicate_application_number_count integer NOT NULL CHECK(duplicate_application_number_count >= 0),
 invalid_case_schema_count integer NOT NULL CHECK(invalid_case_schema_count >= 0),
 missing_common_case_count integer NOT NULL CHECK(missing_common_case_count >= 0),
 ctu_link_mismatch_count integer NOT NULL CHECK(ctu_link_mismatch_count >= 0),
 document_link_broken_count integer NOT NULL CHECK(document_link_broken_count >= 0),
 photo_link_broken_count integer NOT NULL CHECK(photo_link_broken_count >= 0),
 revision_gap_count integer NOT NULL CHECK(revision_gap_count >= 0),
 office_scope_mismatch_count integer NOT NULL CHECK(office_scope_mismatch_count >= 0),
 dangling_user_reference_count integer NOT NULL CHECK(dangling_user_reference_count >= 0),
 status text NOT NULL CHECK(status IN ('healthy','warning','critical')),
 blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
 warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
 evidence_reference text NOT NULL,
 evidence_sha256 char(64) NOT NULL CHECK(evidence_sha256 ~ '^[a-f0-9]{64}$'),
 recorded_by uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cross_data_integrity_env_time ON cross_data_integrity_snapshots(environment, measured_at DESC);

CREATE TABLE IF NOT EXISTS data_integrity_issues (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 source_type text NOT NULL CHECK(source_type IN ('database-search','attachment','cross-data','application-case','ctu-link','other')),
 source_reference text NOT NULL DEFAULT '',
 title text NOT NULL,
 severity text NOT NULL CHECK(severity IN ('critical','high','medium','low')),
 detected_at timestamptz NOT NULL,
 due_at timestamptz NOT NULL,
 description text NOT NULL,
 remediation_plan text NOT NULL,
 owner_user_id uuid NOT NULL REFERENCES users(id),
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','investigating','remediating','resolved','verified','closed','cancelled')),
 resolution_note text NOT NULL DEFAULT '',
 evidence_sha256 char(64),
 resolved_by uuid REFERENCES users(id),
 resolved_at timestamptz,
 verification_note text NOT NULL DEFAULT '',
 verified_by uuid REFERENCES users(id),
 verified_at timestamptz,
 created_by uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_data_integrity_issue_due ON data_integrity_issues(status, severity, due_at);

CREATE TABLE IF NOT EXISTS data_assurance_review_cycles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 period_start date NOT NULL,
 period_end date NOT NULL CHECK(period_end >= period_start),
 title text NOT NULL,
 summary text NOT NULL,
 decision text NOT NULL DEFAULT '',
 next_actions text NOT NULL,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','reviewed','approved','returned','cancelled')),
 snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
 snapshot_sha256 char(64),
 created_by uuid NOT NULL REFERENCES users(id),
 submitted_by uuid REFERENCES users(id),
 submitted_at timestamptz,
 reviewed_by uuid REFERENCES users(id),
 reviewed_at timestamptz,
 review_note text NOT NULL DEFAULT '',
 approved_by uuid REFERENCES users(id),
 approved_at timestamptz,
 approval_note text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_data_assurance_review_period ON data_assurance_review_cycles(period_end DESC, status);

COMMIT;
