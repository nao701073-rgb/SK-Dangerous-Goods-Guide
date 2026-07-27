BEGIN;

CREATE TABLE IF NOT EXISTS usage_monitoring_policies (
  id bigserial PRIMARY KEY,
  policy_key text NOT NULL UNIQUE,
  voluntary_use boolean NOT NULL DEFAULT true,
  prohibit_evaluation_use boolean NOT NULL DEFAULT true,
  allowed_purposes jsonb NOT NULL DEFAULT '["security","incident-investigation","misuse-review","service-improvement","audit"]'::jsonb,
  note text,
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO usage_monitoring_policies(policy_key, voluntary_use, prohibit_evaluation_use, note)
VALUES ('default', true, true, '利用の有無・頻度は評価、警告、是正の根拠に使用しない。')
ON CONFLICT (policy_key) DO UPDATE SET
  voluntary_use = EXCLUDED.voluntary_use,
  prohibit_evaluation_use = EXCLUDED.prohibit_evaluation_use,
  note = EXCLUDED.note,
  updated_at = now();

COMMIT;
