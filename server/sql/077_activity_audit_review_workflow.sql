-- Part 227: periodic activity audit review workflow
CREATE TABLE IF NOT EXISTS activity_audit_reviews (
  id bigserial PRIMARY KEY,
  period_type text NOT NULL CHECK (period_type IN ('daily','weekly','monthly')),
  period_from date NOT NULL,
  period_to date NOT NULL,
  conclusion text NOT NULL CHECK (conclusion IN ('normal','follow-up','escalated')),
  summary text NOT NULL,
  next_action text,
  next_review_date date,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (period_to >= period_from)
);
CREATE INDEX IF NOT EXISTS idx_activity_audit_reviews_period ON activity_audit_reviews(period_from DESC,period_type);
CREATE INDEX IF NOT EXISTS idx_activity_audit_reviews_next ON activity_audit_reviews(next_review_date) WHERE next_review_date IS NOT NULL;
