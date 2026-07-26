BEGIN;

CREATE TABLE IF NOT EXISTS regulation_release_plans (
  release_id text PRIMARY KEY,
  regulation_id text NOT NULL,
  edition_label text NOT NULL,
  manifest_sha256 char(64) NOT NULL,
  integrity_audit_sha256 char(64) NOT NULL,
  release_mode text NOT NULL CHECK (release_mode IN ('immediate','scheduled')),
  scheduled_at timestamptz,
  effective_from date NOT NULL,
  rollback_revision_id text NOT NULL,
  prepared_by text NOT NULL,
  approved_by text NOT NULL,
  gate_status text NOT NULL CHECK (gate_status IN ('ready','blocked','published','cancelled','rolled-back')),
  gate_checks jsonb NOT NULL DEFAULT '[]'::jsonb,
  release_plan_sha256 char(64) NOT NULL,
  published_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  rolled_back_at timestamptz,
  rollback_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (prepared_by <> approved_by),
  CHECK (release_mode = 'immediate' OR scheduled_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_regulation_release_plans_schedule
  ON regulation_release_plans (gate_status, scheduled_at);

CREATE TABLE IF NOT EXISTS regulation_release_events (
  event_id bigserial PRIMARY KEY,
  release_id text NOT NULL REFERENCES regulation_release_plans(release_id),
  event_type text NOT NULL CHECK (event_type IN ('created','approved','published','cancelled','rollback-started','rolled-back')),
  actor_id text NOT NULL,
  reason text,
  evidence_sha256 char(64),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
