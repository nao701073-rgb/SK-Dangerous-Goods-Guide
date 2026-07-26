-- Part 131: access audit rule approval, scheduled release and rollback
CREATE TABLE IF NOT EXISTS corrective_evidence_audit_rule_proposals (
  id text PRIMARY KEY,
  proposal_type text NOT NULL CHECK (proposal_type IN ('change', 'rollback')),
  status text NOT NULL CHECK (status IN ('pending-approval', 'approved', 'approved-scheduled', 'applied', 'rejected')),
  reason text NOT NULL,
  previous_rules jsonb NOT NULL,
  candidate_rules jsonb NOT NULL,
  simulation_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  simulation_hash text,
  simulated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  release_mode text NOT NULL CHECK (release_mode IN ('immediate', 'scheduled')),
  scheduled_at timestamptz,
  approved_at timestamptz,
  approved_by text,
  applied_at timestamptz,
  applied_by text,
  rejected_at timestamptz,
  rejected_by text,
  rejection_reason text,
  source_proposal_id text REFERENCES corrective_evidence_audit_rule_proposals(id),
  CONSTRAINT corrective_evidence_audit_rule_separation CHECK (approved_by IS NULL OR approved_by <> created_by),
  CONSTRAINT corrective_evidence_audit_rule_schedule CHECK (release_mode <> 'scheduled' OR scheduled_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_corrective_evidence_audit_rule_proposals_status
  ON corrective_evidence_audit_rule_proposals(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_corrective_evidence_audit_rule_proposals_created
  ON corrective_evidence_audit_rule_proposals(created_at DESC);
