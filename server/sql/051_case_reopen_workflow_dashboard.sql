-- Part 144: reopened case workflow dashboard and reporting
CREATE INDEX IF NOT EXISTS idx_case_reopen_requests_office_status_requested
  ON corrective_case_reopen_requests(office_id, status, requested_at DESC);

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
  COALESCE(i.reevaluation_due_at, i.corrective_due_at, i.due_at) AS current_due_at,
  CASE
    WHEN COALESCE(i.reevaluation_due_at, i.corrective_due_at, i.due_at) IS NOT NULL
      AND COALESCE(i.reevaluation_due_at, i.corrective_due_at, i.due_at) < now()
      AND COALESCE(i.status, r.status) NOT IN ('reclosed', 'cancelled')
    THEN true ELSE false
  END AS overdue,
  i.reclosure_certificate_id
FROM corrective_case_reopen_requests r
LEFT JOIN LATERAL (
  SELECT x.*
  FROM case_reopen_investigations x
  WHERE x.reopen_request_id = r.id AND x.status <> 'cancelled'
  ORDER BY x.started_at DESC
  LIMIT 1
) i ON true;
