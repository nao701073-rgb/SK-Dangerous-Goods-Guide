CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS blocks (
  id text PRIMARY KEY,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS offices (
  id text PRIMARY KEY,
  block_id text NOT NULL REFERENCES blocks(id),
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  photo_limit_per_application integer NOT NULL DEFAULT 20,
  photo_limit_total integer NOT NULL DEFAULT 1000,
  photo_max_file_mb integer NOT NULL DEFAULT 8,
  photo_storage_limit_mb integer NOT NULL DEFAULT 500,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  display_name text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('office-user','office-admin','safety-environment-admin')),
  office_id text REFERENCES offices(id),
  active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (role = 'safety-environment-admin' OR office_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text UNIQUE,
  application_number text NOT NULL,
  shipper text NOT NULL DEFAULT '',
  cargo_name text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT '登録済み',
  block_id text NOT NULL REFERENCES blocks(id),
  office_id text NOT NULL REFERENCES offices(id),
  created_by uuid REFERENCES users(id),
  updated_by uuid REFERENCES users(id),
  version integer NOT NULL DEFAULT 1,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (office_id, application_number)
);

CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text UNIQUE,
  application_id uuid NOT NULL REFERENCES applications(id),
  block_id text NOT NULL REFERENCES blocks(id),
  office_id text NOT NULL REFERENCES offices(id),
  original_name text NOT NULL,
  stored_name text UNIQUE NOT NULL,
  mime_type text NOT NULL,
  file_size bigint NOT NULL,
  sha256 text NOT NULL,
  shooting_at timestamptz,
  registered_by_name text NOT NULL DEFAULT '',
  comment text NOT NULL DEFAULT '',
  created_by uuid REFERENCES users(id),
  version integer NOT NULL DEFAULT 1,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  role text,
  office_id text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  ip_address inet,
  user_agent text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_applications_office_updated ON applications(office_id, updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_photos_application ON photos(application_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_photos_office ON photos(office_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
