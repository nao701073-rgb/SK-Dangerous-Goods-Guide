CREATE TABLE IF NOT EXISTS system_runtime_settings (
  setting_key text PRIMARY KEY,
  setting_value jsonb NOT NULL,
  updated_by uuid NULL REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO system_runtime_settings(setting_key,setting_value)
VALUES('access_policy','{"authenticationRequired":true}'::jsonb)
ON CONFLICT(setting_key) DO NOTHING;
