CREATE TABLE IF NOT EXISTS production_adoption_reviews (
  id BIGSERIAL PRIMARY KEY,
  review_period VARCHAR(20) NOT NULL,
  decision VARCHAR(30) NOT NULL,
  note TEXT NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS production_training_records (
  id BIGSERIAL PRIMARY KEY, training_date DATE, audience VARCHAR(60) NOT NULL, content TEXT NOT NULL,
  created_by BIGINT REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_production_adoption_reviews_period ON production_adoption_reviews(review_period, created_at DESC);
