-- Part 130: access audit rule simulation history
CREATE TABLE IF NOT EXISTS corrective_evidence_audit_rule_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id text,
  simulated_by text NOT NULL,
  simulated_at timestamptz NOT NULL DEFAULT now(),
  log_count integer NOT NULL DEFAULT 0,
  current_rules jsonb NOT NULL,
  candidate_rules jsonb NOT NULL,
  summary jsonb NOT NULL,
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  result_hash text
);

CREATE INDEX IF NOT EXISTS idx_ce_audit_rule_simulations_date
  ON corrective_evidence_audit_rule_simulations (simulated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ce_audit_rule_simulations_office
  ON corrective_evidence_audit_rule_simulations (office_id, simulated_at DESC);
