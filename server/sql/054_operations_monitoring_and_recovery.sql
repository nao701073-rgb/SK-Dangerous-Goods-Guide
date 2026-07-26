-- Part 147: operations monitoring, incidents, recovery drills and periodic inspections

CREATE TABLE IF NOT EXISTS operations_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT UNIQUE,
  office_id UUID NOT NULL,
  title TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','recovering','review','closed')),
  occurred_at TIMESTAMPTZ NOT NULL,
  due_at TIMESTAMPTZ,
  reported_by TEXT NOT NULL,
  assignee TEXT,
  description TEXT NOT NULL,
  workaround TEXT,
  resolution TEXT,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS operations_incident_events (
  id BIGSERIAL PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES operations_incidents(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('office-admin','admin')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS operations_recovery_drills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT UNIQUE,
  office_id UUID NOT NULL,
  drill_type TEXT NOT NULL,
  performed_at TIMESTAMPTZ NOT NULL,
  performed_by TEXT NOT NULL,
  reviewed_by TEXT NOT NULL,
  scenario TEXT NOT NULL,
  result TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (performed_by <> reviewed_by)
);

CREATE TABLE IF NOT EXISTS operations_inspection_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT UNIQUE,
  office_id UUID NOT NULL,
  name TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly','quarterly','semiannual','annual','custom')),
  due_at TIMESTAMPTZ NOT NULL,
  owner_name TEXT NOT NULL,
  inspection_items TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','completed')),
  last_result TEXT,
  completed_by TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS operations_check_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID,
  overall TEXT NOT NULL CHECK (overall IN ('pass','warning','fail')),
  result_json JSONB NOT NULL,
  verification_hash TEXT NOT NULL,
  checked_by TEXT NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operations_incidents_office_status_due ON operations_incidents(office_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_operations_drills_office_performed ON operations_recovery_drills(office_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_operations_inspections_office_due ON operations_inspection_plans(office_id, status, due_at);
