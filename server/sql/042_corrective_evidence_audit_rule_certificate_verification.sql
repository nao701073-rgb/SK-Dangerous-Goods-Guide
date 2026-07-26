-- Part 135: 監査ルール適用証明の検証履歴・月次照合
CREATE TABLE IF NOT EXISTS corrective_evidence_audit_rule_certificate_verifications (
  verification_id text PRIMARY KEY,
  certificate_id text NOT NULL,
  proposal_id text,
  valid boolean NOT NULL,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  calculated_hash text NOT NULL,
  registered_hash text,
  checked_at timestamptz NOT NULL,
  checked_by text NOT NULL,
  source text NOT NULL CHECK (source IN ('ledger', 'import', 'monthly')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_rule_certificate_verifications_certificate
  ON corrective_evidence_audit_rule_certificate_verifications (certificate_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_rule_certificate_verifications_invalid
  ON corrective_evidence_audit_rule_certificate_verifications (checked_at DESC)
  WHERE valid = false;

CREATE TABLE IF NOT EXISTS corrective_evidence_audit_rule_certificate_monthly_reconciliations (
  report_id text PRIMARY KEY,
  target_month char(7) NOT NULL,
  generated_at timestamptz NOT NULL,
  generated_by text NOT NULL,
  summary jsonb NOT NULL,
  duplicate_certificate_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  duplicate_proposal_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  records jsonb NOT NULL DEFAULT '[]'::jsonb,
  report_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_rule_certificate_monthly_target
  ON corrective_evidence_audit_rule_certificate_monthly_reconciliations (target_month, generated_at DESC);
