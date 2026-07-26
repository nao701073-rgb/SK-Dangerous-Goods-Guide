#!/bin/sh
set -eu
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${PHOTO_STORAGE_DIR:=/app/storage/photos}"
psql "$DATABASE_URL" --set ON_ERROR_STOP=on <<'SQL'
SELECT 'applications' AS target, count(*) FROM applications WHERE deleted_at IS NULL;
SELECT 'photos' AS target, count(*) FROM photos WHERE deleted_at IS NULL;
SELECT 'users' AS target, count(*) FROM users WHERE active=true;
SELECT 'orphan_photos' AS target, count(*) FROM photos p LEFT JOIN applications a ON a.id=p.application_id WHERE a.id IS NULL;
SQL
missing=0
for stored in $(psql "$DATABASE_URL" -Atc "SELECT stored_name FROM photos WHERE deleted_at IS NULL"); do
  if [ ! -f "$PHOTO_STORAGE_DIR/$stored" ]; then
    echo "Missing photo file: $stored" >&2
    missing=$((missing+1))
  fi
done
[ "$missing" -eq 0 ] || exit 2
echo "Integrity check completed successfully."
