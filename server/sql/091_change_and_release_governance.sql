-- Part 252: 変更要求・次期版管理
CREATE TABLE IF NOT EXISTS change_requests (
  id BIGSERIAL PRIMARY KEY,
  change_code VARCHAR(80) NOT NULL UNIQUE,
  title TEXT NOT NULL,
  change_type VARCHAR(40) NOT NULL,
  target_area TEXT,
  description TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  requested_date DATE,
  requester_name TEXT,
  requester_user_id BIGINT REFERENCES users(id),
  status VARCHAR(30) NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_change_requests_status_priority ON change_requests(status, priority, requested_date);

CREATE TABLE IF NOT EXISTS change_impact_assessments (
  id BIGSERIAL PRIMARY KEY,
  change_request_id BIGINT NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
  impact_assessment TEXT NOT NULL,
  risk_assessment TEXT NOT NULL,
  decision VARCHAR(30) NOT NULL DEFAULT 'pending',
  decision_notes TEXT,
  assessed_by BIGINT REFERENCES users(id),
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS release_candidates (
  id BIGSERIAL PRIMARY KEY,
  change_request_id BIGINT NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
  candidate_version VARCHAR(120),
  test_plan TEXT,
  test_result TEXT,
  decision VARCHAR(30) NOT NULL DEFAULT 'draft',
  rollback_retirement_plan TEXT,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_release_candidates_decision ON release_candidates(decision, updated_at DESC);
