BEGIN;

CREATE TABLE IF NOT EXISTS corrective_case_closure_certificates (
  id BIGSERIAL PRIMARY KEY,
  certificate_id TEXT NOT NULL UNIQUE,
  corrective_action_id TEXT NOT NULL UNIQUE,
  parent_corrective_action_id TEXT,
  certificate_reference_id TEXT,
  proposal_id TEXT,
  office_id TEXT NOT NULL,
  office_name TEXT,
  certificate_payload JSONB NOT NULL,
  verification_hash TEXT NOT NULL,
  closed_by TEXT NOT NULL,
  closed_at TIMESTAMPTZ NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'archived' CHECK (status = 'archived')
);

CREATE INDEX IF NOT EXISTS idx_case_closure_certificates_office_closed_at
  ON corrective_case_closure_certificates (office_id, closed_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_closure_certificates_reference
  ON corrective_case_closure_certificates (certificate_reference_id, proposal_id);

COMMIT;
