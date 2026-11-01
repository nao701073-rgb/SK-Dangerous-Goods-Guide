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
  recorded_by uuid REFERENCES users(id),
  reviewed_by uuid REFERENCES users(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revocation_reason text,
  UNIQUE (case_reference, regulation_id, revision_id, snapshot_sha256)
);
CREATE INDEX IF NOT EXISTS idx_regulation_evidence_case ON regulation_evidence_snapshots (case_reference, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_regulation_evidence_asof ON regulation_evidence_snapshots (regulation_id, as_of_date);
COMMENT ON TABLE regulation_evidence_snapshots IS '案件時点で採用した法令版・原本・データ・判定根拠の不変記録。承認後は更新せず、訂正は新規スナップショットと取消記録で行う。';


-- Approved case evidence snapshots may only be revoked (with a reason),
-- not replaced, re-hashed or deleted. Revisions require a new snapshot row.
CREATE OR REPLACE FUNCTION skdg_regulation_case_snapshot_protect()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
 IF TG_OP='DELETE' THEN
   RAISE EXCEPTION 'SKDG regulation case evidence may not be deleted' USING ERRCODE='23514';
 END IF;
 IF OLD.approved_at IS NOT NULL AND
    (to_jsonb(NEW) - 'revoked_at' - 'revocation_reason')
    IS DISTINCT FROM
    (to_jsonb(OLD) - 'revoked_at' - 'revocation_reason') THEN
   RAISE EXCEPTION 'SKDG approved evidence is immutable; create a new snapshot'
     USING ERRCODE='23514';
 END IF;
 IF OLD.revoked_at IS NOT NULL AND
    (NEW.revoked_at IS DISTINCT FROM OLD.revoked_at OR
     NEW.revocation_reason IS DISTINCT FROM OLD.revocation_reason) THEN
   RAISE EXCEPTION 'SKDG evidence revocation cannot be changed'
     USING ERRCODE='23514';
 END IF;
 IF NEW.revoked_at IS NOT NULL AND
    (NEW.revocation_reason IS NULL OR btrim(NEW.revocation_reason)='') THEN
   RAISE EXCEPTION 'SKDG evidence revocation requires a reason'
     USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END
$fn$;
DROP TRIGGER IF EXISTS trg_skdg_regulation_case_snapshot_protect ON regulation_evidence_snapshots;
CREATE TRIGGER trg_skdg_regulation_case_snapshot_protect
 BEFORE UPDATE OR DELETE ON regulation_evidence_snapshots FOR EACH ROW
 EXECUTE FUNCTION skdg_regulation_case_snapshot_protect();
