-- TEST156 LAB ONLY. Not an approved release migration.
-- Preserves client-side text IDs without coercing them to UUIDs.
-- Records authenticated sync activity separately from the legacy UUID request table.
CREATE TABLE IF NOT EXISTS case_reopen_sync_state (
  entity_type text NOT NULL CHECK (entity_type IN ('request','investigation','certificate')),
  client_id text NOT NULL,
  office_id text NOT NULL REFERENCES offices(id),
  status text NOT NULL,
  snapshot jsonb NOT NULL,
  actor_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_by uuid NOT NULL REFERENCES users(id),
  updated_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entity_type, client_id)
);
CREATE INDEX IF NOT EXISTS idx_case_reopen_sync_state_office ON case_reopen_sync_state(office_id, entity_type, updated_at DESC);

CREATE TABLE IF NOT EXISTS case_reopen_sync_receipts (
  queue_id text PRIMARY KEY,
  request_sha256 text NOT NULL,
  entity_type text NOT NULL,
  client_id text NOT NULL,
  office_id text NOT NULL REFERENCES offices(id),
  action text NOT NULL,
  actor_id uuid NOT NULL REFERENCES users(id),
  response jsonb NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_case_reopen_sync_receipts_case ON case_reopen_sync_receipts(entity_type,client_id,recorded_at DESC);

-- Dedicated view: legacy case_reopen_workflow_dashboard remains untouched.
-- This avoids silently mixing UUID-source requests with browser-generated text IDs.
CREATE OR REPLACE VIEW case_reopen_local_sync_dashboard AS
SELECT r.client_id AS reopen_request_id,
       r.office_id, r.status AS request_status,
       i.id AS investigation_id, i.status AS workflow_status,
       CASE
         WHEN i.status IN ('investigating','pending-review') THEN i.due_at
         WHEN i.status IN ('corrective-in-progress','pending-corrective-verification') THEN i.corrective_due_at
         WHEN i.status='reevaluation-pending' THEN i.reevaluation_due_at
         ELSE NULL::timestamptz
       END AS current_due_at,
       CASE WHEN i.id IS NOT NULL AND i.status NOT IN ('reclosed','cancelled')
           AND (CASE
             WHEN i.status IN ('investigating','pending-review') THEN i.due_at
             WHEN i.status IN ('corrective-in-progress','pending-corrective-verification') THEN i.corrective_due_at
             WHEN i.status='reevaluation-pending' THEN i.reevaluation_due_at
             ELSE NULL::timestamptz END) < now()
         THEN true ELSE false END AS overdue,
       i.reclosure_certificate_id
FROM case_reopen_sync_state r
LEFT JOIN LATERAL (
    SELECT t.* FROM case_reopen_sync_state s
      JOIN case_reopen_investigations t ON t.id=s.client_id
    WHERE s.entity_type='investigation' AND s.office_id=r.office_id
      AND t.reopen_request_id=r.client_id
    ORDER BY s.updated_at DESC,s.client_id DESC LIMIT 1
) i ON true
WHERE r.entity_type='request';
