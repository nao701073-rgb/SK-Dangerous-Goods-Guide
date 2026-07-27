-- Part 222: user activity monitoring and inappropriate-use prevention
CREATE TABLE IF NOT EXISTS user_activity_events (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  event_type text NOT NULL,
  feature text NOT NULL,
  page_path text,
  target_type text,
  target_id text,
  session_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_time ON user_activity_events(user_id,occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_feature_time ON user_activity_events(feature,occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_type_time ON user_activity_events(event_type,occurred_at DESC);
CREATE TABLE IF NOT EXISTS user_activity_alerts (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'warning' CHECK(severity IN ('info','warning','critical')),
  window_minutes integer NOT NULL,
  event_count integer NOT NULL,
  summary text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','reviewing','closed')),
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_activity_alerts_status ON user_activity_alerts(status,created_at DESC);
