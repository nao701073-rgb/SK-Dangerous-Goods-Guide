-- Part 142: 案件クローズ証明の再検証・保管期限・再開申請

CREATE TABLE IF NOT EXISTS corrective_case_closure_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id text NOT NULL,
  corrective_action_id text NOT NULL,
  office_id text NOT NULL,
  verified_by text NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now(),
  result text NOT NULL CHECK (result IN ('passed','failed')),
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  calculated_hash text NOT NULL,
  stored_hash text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_case_closure_verification_certificate
  ON corrective_case_closure_verifications(certificate_id, verified_at DESC);

CREATE TABLE IF NOT EXISTS corrective_case_reopen_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id text NOT NULL,
  corrective_action_id text NOT NULL,
  office_id text NOT NULL,
  requested_by text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL,
  evidence text,
  status text NOT NULL DEFAULT 'pending-approval'
    CHECK (status IN ('pending-approval','approved','rejected','cancelled')),
  approved_by text,
  approved_at timestamptz,
  approval_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (approved_by IS NULL OR approved_by <> requested_by)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_case_reopen_active_certificate
  ON corrective_case_reopen_requests(certificate_id)
  WHERE status IN ('pending-approval','approved');

CREATE INDEX IF NOT EXISTS idx_case_reopen_office_status
  ON corrective_case_reopen_requests(office_id, status, requested_at DESC);

-- 本番APIでは、事業所管理者は所属事業所、管理者は全事業所を対象とし、
-- 再開申請者本人による自己承認を禁止する。
