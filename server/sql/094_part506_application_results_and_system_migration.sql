-- Part 506: application-linked verification/calculation results and full-system migration audit.
CREATE TABLE IF NOT EXISTS application_linked_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text,
  application_id uuid NOT NULL REFERENCES applications(id),
  office_id uuid NOT NULL REFERENCES offices(id),
  result_type text NOT NULL CHECK (result_type IN ('dangerous-goods-verification','ctu-securing','other')),
  title text NOT NULL,
  result_version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'recorded' CHECK (status IN ('recorded','confirmed','cancelled')),
  source_page text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES users(id),
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  cancel_reason text
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_application_linked_results_client ON application_linked_results(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_application_linked_results_application ON application_linked_results(application_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_application_linked_results_office ON application_linked_results(office_id,created_at DESC);

CREATE TABLE IF NOT EXISTS system_migration_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id text UNIQUE,
  source_base_url text NOT NULL,
  source_release text NOT NULL,
  target_path text,
  file_count integer NOT NULL DEFAULT 0,
  total_bytes bigint NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('started','staged','failed','activated','rolled-back')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
