-- Part 103: case-level regulation evidence snapshots
CREATE TABLE IF NOT EXISTS regulation_evidence_snapshots (
  snapshot_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_reference text NOT NULL,
  purpose text NOT NULL DEFAULT 'inspection',
  as_of_date date NOT NULL,
  regulation_id text NOT NULL,
  revision_id text NOT NULL,
  un_number text,
  proper_shipping_name text,
  decision_summary text NOT NULL,
  source_references jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_document_snapshot jsonb NOT NULL,
  dataset_snapshot jsonb NOT NULL,
  snapshot_payload jsonb NOT NULL,
  snapshot_sha256 text NOT NULL,
  recorded_by uuid REFERENCES users(user_id),
  reviewed_by uuid REFERENCES users(user_id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revocation_reason text,
  UNIQUE (case_reference, regulation_id, revision_id, snapshot_sha256)
);
CREATE INDEX IF NOT EXISTS idx_regulation_evidence_case ON regulation_evidence_snapshots (case_reference, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_regulation_evidence_asof ON regulation_evidence_snapshots (regulation_id, as_of_date);
COMMENT ON TABLE regulation_evidence_snapshots IS '案件時点で採用した法令版・原本・データ・判定根拠の不変記録。承認後は更新せず、訂正は新規スナップショットと取消記録で行う。';
