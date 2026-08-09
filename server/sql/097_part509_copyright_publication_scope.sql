-- Part 509: copyright, license and internal/public publication scope governance.

CREATE TABLE IF NOT EXISTS publication_rights_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_key text NOT NULL UNIQUE,
  file_path text NOT NULL,
  display_label text NOT NULL,
  asset_category text NOT NULL,
  source_class text NOT NULL CHECK (source_class IN (
    'official-domestic-law','licensed-international-code','international-guidance',
    'internal-created-source-dependent','third-party-or-unknown','user-upload','system-original'
  )),
  mime_type text,
  file_size bigint NOT NULL DEFAULT 0 CHECK (file_size >= 0),
  checksum_sha256 text NOT NULL CHECK (checksum_sha256 ~ '^[0-9a-f]{64}$'),
  risk_level text NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low','medium','high','critical')),
  status text NOT NULL DEFAULT 'unreviewed' CHECK (status IN (
    'unreviewed','prepared','submitted','reviewed','returned','approved','restricted','metadata-only','prohibited','expired'
  )),
  recommended_scope text NOT NULL DEFAULT 'internal-restricted' CHECK (recommended_scope IN (
    'prototype-review','internal-authenticated','internal-restricted','public-approved'
  )),
  allowed_scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
  public_treatment text NOT NULL DEFAULT 'blocked' CHECK (public_treatment IN (
    'full','excerpt','metadata-only','external-link-only','blocked'
  )),
  rights_holder text NOT NULL DEFAULT '',
  rights_basis text NOT NULL DEFAULT '',
  license_reference text NOT NULL DEFAULT '',
  source_url text NOT NULL DEFAULT '',
  attribution_text text NOT NULL DEFAULT '',
  review_note text NOT NULL DEFAULT '',
  rights_checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  restriction_reason text NOT NULL DEFAULT '',
  rights_expiry_date date,
  prepared_by uuid REFERENCES users(id),
  submitted_by uuid REFERENCES users(id),
  reviewed_by uuid REFERENCES users(id),
  approved_by uuid REFERENCES users(id),
  prepared_at timestamptz,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  approved_at timestamptz,
  last_terms_checked_at timestamptz,
  next_review_due date,
  revision_number integer NOT NULL DEFAULT 1 CHECK (revision_number > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (reviewed_by IS NULL OR prepared_by IS NULL OR reviewed_by <> prepared_by),
  CHECK (approved_by IS NULL OR prepared_by IS NULL OR approved_by <> prepared_by),
  CHECK (approved_by IS NULL OR reviewed_by IS NULL OR approved_by <> reviewed_by)
);
CREATE INDEX IF NOT EXISTS idx_publication_rights_items_status
  ON publication_rights_items(status,risk_level,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_publication_rights_items_class
  ON publication_rights_items(source_class,status);
CREATE INDEX IF NOT EXISTS idx_publication_rights_items_review_due
  ON publication_rights_items(next_review_due) WHERE status IN ('approved','restricted','metadata-only');

CREATE TABLE IF NOT EXISTS publication_rights_events (
  id bigserial PRIMARY KEY,
  item_id uuid NOT NULL REFERENCES publication_rights_items(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN (
    'catalog-created','catalog-updated','prepared','submitted','reviewed','returned','approved',
    'restricted','metadata-only','prohibited','expired','scope-changed','checksum-changed'
  )),
  actor_user_id uuid REFERENCES users(id),
  actor_role text,
  comment text NOT NULL DEFAULT '',
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  decision_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  checksum_sha256 text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_publication_rights_events_item
  ON publication_rights_events(item_id,created_at DESC);

CREATE TABLE IF NOT EXISTS publication_scope_profiles (
  scope_key text PRIMARY KEY CHECK (scope_key IN (
    'prototype-review','internal-authenticated','internal-restricted','public-approved'
  )),
  display_name text NOT NULL,
  description text NOT NULL DEFAULT '',
  enforcement_enabled boolean NOT NULL DEFAULT true,
  default_unreviewed_treatment text NOT NULL DEFAULT 'blocked' CHECK (default_unreviewed_treatment IN (
    'full','excerpt','metadata-only','external-link-only','blocked'
  )),
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO publication_scope_profiles(scope_key,display_name,description,enforcement_enabled,default_unreviewed_treatment)
VALUES
 ('prototype-review','試作・権利確認中','確認状況を表示し、正式な外部公開判断には使用しない。',false,'blocked'),
 ('internal-authenticated','社内・認証済み利用者','社内利用が承認された情報だけを表示する。',true,'blocked'),
 ('internal-restricted','社内・権限者限定','安全環境室等の権限者に限定して表示する。',true,'blocked'),
 ('public-approved','外部公開・承認済みのみ','外部公開が明示承認された情報だけを配布する。',true,'blocked')
ON CONFLICT(scope_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS publication_catalog_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_release text NOT NULL,
  scanned_count integer NOT NULL DEFAULT 0,
  inserted_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  checksum_changed_count integer NOT NULL DEFAULT 0,
  unchanged_count integer NOT NULL DEFAULT 0,
  total_bytes bigint NOT NULL DEFAULT 0,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  executed_by uuid REFERENCES users(id),
  executed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS publication_release_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_version text NOT NULL,
  target_scope text NOT NULL CHECK (target_scope IN (
    'prototype-review','internal-authenticated','internal-restricted','public-approved'
  )),
  total_assets integer NOT NULL DEFAULT 0,
  included_assets integer NOT NULL DEFAULT 0,
  excluded_assets integer NOT NULL DEFAULT 0,
  blocked_assets integer NOT NULL DEFAULT 0,
  unresolved_high_risk integer NOT NULL DEFAULT 0,
  result text NOT NULL CHECK (result IN ('passed','warning','failed')),
  report jsonb NOT NULL DEFAULT '{}'::jsonb,
  executed_by uuid REFERENCES users(id),
  executed_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE VIEW publication_rights_summary AS
SELECT
  count(*)::int AS total,
  count(*) FILTER (WHERE status='approved')::int AS approved,
  count(*) FILTER (WHERE status='restricted')::int AS restricted,
  count(*) FILTER (WHERE status='metadata-only')::int AS metadata_only,
  count(*) FILTER (WHERE status='prohibited')::int AS prohibited,
  count(*) FILTER (WHERE status IN ('unreviewed','prepared','submitted','reviewed','returned'))::int AS pending,
  count(*) FILTER (WHERE status='expired' OR (rights_expiry_date IS NOT NULL AND rights_expiry_date < current_date))::int AS expired,
  count(*) FILTER (WHERE risk_level IN ('high','critical') AND status IN ('unreviewed','prepared','submitted','reviewed','returned'))::int AS unresolved_high_risk,
  count(*) FILTER (WHERE source_class='licensed-international-code')::int AS licensed_international_code,
  count(*) FILTER (WHERE source_class='official-domestic-law')::int AS official_domestic_law,
  count(*) FILTER (WHERE source_class='internal-created-source-dependent')::int AS internal_created,
  COALESCE(sum(file_size),0)::bigint AS total_bytes
FROM publication_rights_items;
