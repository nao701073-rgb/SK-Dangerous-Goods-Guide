#!/bin/sh
set -eu
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${ATTACHMENT_STORAGE_DIR:=${PHOTO_STORAGE_DIR:-/app/storage/attachments}}"
psql "$DATABASE_URL" --set ON_ERROR_STOP=on <<'SQL'
SELECT 'applications' AS target, count(*) FROM applications WHERE deleted_at IS NULL;
SELECT 'photos' AS target, count(*) FROM photos WHERE deleted_at IS NULL;
SELECT 'application_documents' AS target, count(*) FROM application_documents WHERE cancelled_at IS NULL;
SELECT 'application_linked_results' AS target, count(*) FROM application_linked_results WHERE cancelled_at IS NULL;
SELECT 'users' AS target, count(*) FROM users WHERE active=true;
SELECT 'orphan_photos' AS target, count(*) FROM photos p LEFT JOIN applications a ON a.id=p.application_id WHERE a.id IS NULL;
SELECT 'orphan_documents' AS target, count(*) FROM application_documents d LEFT JOIN applications a ON a.id=d.application_id WHERE a.id IS NULL;
SELECT 'orphan_results' AS target, count(*) FROM application_linked_results r LEFT JOIN applications a ON a.id=r.application_id WHERE a.id IS NULL;
SQL
orphans=$(psql "$DATABASE_URL" -Atc "SELECT (SELECT count(*) FROM photos p LEFT JOIN applications a ON a.id=p.application_id WHERE a.id IS NULL)+(SELECT count(*) FROM application_documents d LEFT JOIN applications a ON a.id=d.application_id WHERE a.id IS NULL)+(SELECT count(*) FROM application_linked_results r LEFT JOIN applications a ON a.id=r.application_id WHERE a.id IS NULL);")
[ "$orphans" -eq 0 ] || { echo "Orphan records detected: $orphans" >&2; exit 2; }
missing=0
for stored in $(psql "$DATABASE_URL" -Atc "SELECT COALESCE(storage_key,stored_name) FROM photos WHERE deleted_at IS NULL UNION ALL SELECT storage_key FROM application_documents WHERE cancelled_at IS NULL"); do
  [ -n "$stored" ] || continue
  if [ "${STORAGE_PROVIDER:-filesystem}" = "filesystem" ] && [ ! -f "$ATTACHMENT_STORAGE_DIR/$stored" ]; then
    echo "Missing attachment file: $stored" >&2
    missing=$((missing+1))
  fi
done
[ "$missing" -eq 0 ] || exit 3
echo "Integrity check completed successfully."
