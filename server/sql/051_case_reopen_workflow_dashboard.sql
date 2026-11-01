-- Part 144: reopened case workflow dashboard and reporting
CREATE INDEX IF NOT EXISTS idx_case_reopen_requests_office_status_requested
  ON corrective_case_reopen_requests(office_id, status, requested_at DESC);

ALTER TABLE case_reopen_investigations
  ADD COLUMN IF NOT EXISTS corrective_due_at timestamptz;

ALTER TABLE case_reopen_investigations
  ADD COLUMN IF NOT EXISTS reevaluation_due_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_case_reopen_investigations_workflow_due
  ON case_reopen_investigations(office_id, status, due_at, corrective_due_at, reevaluation_due_at);

CREATE OR REPLACE VIEW case_reopen_workflow_dashboard AS
SELECT
  r.id AS reopen_request_id,
  r.certificate_id,
  r.corrective_action_id,
  r.office_id,
  r.status AS request_status,
  r.requested_by,
  r.requested_at,
  r.reason,
  i.id AS investigation_id,
  i.status AS workflow_status,
  i.assigned_to,
  i.progress,
  (CASE WHEN i.status IN ('investigating','pending-review') THEN i.due_at WHEN i.status IN ('corrective-in-progress','pending-corrective-verification') THEN i.corrective_due_at WHEN i.status='reevaluation-pending' THEN i.reevaluation_due_at ELSE NULL::timestamptz END) AS current_due_at,
  CASE
    WHEN (CASE WHEN i.status IN ('investigating','pending-review') THEN i.due_at WHEN i.status IN ('corrective-in-progress','pending-corrective-verification') THEN i.corrective_due_at WHEN i.status='reevaluation-pending' THEN i.reevaluation_due_at ELSE NULL::timestamptz END) IS NOT NULL
      AND (CASE WHEN i.status IN ('investigating','pending-review') THEN i.due_at WHEN i.status IN ('corrective-in-progress','pending-corrective-verification') THEN i.corrective_due_at WHEN i.status='reevaluation-pending' THEN i.reevaluation_due_at ELSE NULL::timestamptz END) < now()
      AND COALESCE(i.status, r.status) NOT IN ('reclosed', 'cancelled')
    THEN true ELSE false
  END AS overdue,
  i.reclosure_certificate_id
FROM corrective_case_reopen_requests r
LEFT JOIN LATERAL (
  SELECT x.*
  FROM case_reopen_investigations x
  WHERE x.reopen_request_id = r.id::text AND x.status <> 'cancelled'
  ORDER BY x.created_at DESC
  LIMIT 1
) i ON true;
