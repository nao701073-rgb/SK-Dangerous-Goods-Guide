#!/bin/sh
set -eu
STAMP=$(date -u +%Y%m%d_%H%M%S)
BACKUP_ID="backup_${STAMP}"
DEST=${BACKUP_DIR:-/backups}
SET_DIR="$DEST/$BACKUP_ID"
RETENTION=${BACKUP_RETENTION_DAYS:-30}
: "${DATABASE_URL:?DATABASE_URL is required}"
DB_RETENTION=$(psql "$DATABASE_URL" -Atc "SELECT retention_days FROM system_backup_settings WHERE id='default'" 2>/dev/null || true)
[ -n "$DB_RETENTION" ] && RETENTION=$DB_RETENTION
PROVIDER=${STORAGE_PROVIDER:-filesystem}
ATTACHMENT_DIR=${ATTACHMENT_STORAGE_DIR:-${PHOTO_STORAGE_DIR:-/app/storage/attachments}}
mkdir -p "$SET_DIR"

sql_escape() { printf "%s" "$1" | sed "s/'/''/g"; }
record_failure() {
  code=$?
  message="backup command failed with exit code $code"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=0 -c "UPDATE system_backup_runs SET status='failed',completed_at=now(),error_message='$(sql_escape "$message")' WHERE backup_id='$(sql_escape "$BACKUP_ID")'" >/dev/null 2>&1 || true
  exit "$code"
}
trap record_failure INT TERM HUP EXIT

psql "$DATABASE_URL" --set ON_ERROR_STOP=on -c "INSERT INTO system_backup_runs(backup_id,status,storage_location,created_by) VALUES('$(sql_escape "$BACKUP_ID")','running','$(sql_escape "$SET_DIR")','scheduler') ON CONFLICT(backup_id) DO NOTHING" >/dev/null

DB_FILE="$SET_DIR/database.sql.gz"
ATTACHMENT_FILE="$SET_DIR/attachments.tar.gz"
MANIFEST_FILE="$SET_DIR/manifest.json"
pg_dump "$DATABASE_URL" --format=plain --no-owner --no-privileges | gzip -9 > "$DB_FILE"

if [ "$PROVIDER" = "filesystem" ]; then
  mkdir -p "$ATTACHMENT_DIR"
  tar -czf "$ATTACHMENT_FILE" -C "$ATTACHMENT_DIR" .
else
  ATTACHMENT_FILE="$SET_DIR/attachments-object-storage-pointer.json"
  cat > "$ATTACHMENT_FILE" <<EOF
{"provider":"$PROVIDER","bucket":"${S3_BUCKET:-}","prefix":"${S3_PREFIX:-inspection-support}","note":"Object storage must have versioning and lifecycle protection enabled. Set OFFSITE_BACKUP_COMMAND for an independent copy."}
EOF
fi

DB_SHA=$(sha256sum "$DB_FILE" | awk '{print $1}')
ATTACHMENT_SHA=$(sha256sum "$ATTACHMENT_FILE" | awk '{print $1}')
cat > "$MANIFEST_FILE" <<EOF
{
  "backupId":"$BACKUP_ID",
  "createdAt":"$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "storageProvider":"$PROVIDER",
  "databaseFile":"$(basename "$DB_FILE")",
  "attachmentFile":"$(basename "$ATTACHMENT_FILE")",
  "databaseSha256":"$DB_SHA",
  "attachmentSha256":"$ATTACHMENT_SHA",
  "systemVersion":"Part 503"
}
EOF
MANIFEST_SHA=$(sha256sum "$MANIFEST_FILE" | awk '{print $1}')
sha256sum "$DB_FILE" "$ATTACHMENT_FILE" "$MANIFEST_FILE" > "$SET_DIR/SHA256SUMS"

offsite_location=""
if [ -n "${OFFSITE_BACKUP_COMMAND:-}" ]; then
  export BACKUP_SET_DIR="$SET_DIR" BACKUP_ID
  sh -c "$OFFSITE_BACKUP_COMMAND"
  offsite_location=${OFFSITE_BACKUP_LOCATION:-configured-command}
fi

psql "$DATABASE_URL" --set ON_ERROR_STOP=on -c "UPDATE system_backup_runs SET status='completed',database_file='$(sql_escape "$DB_FILE")',attachment_file='$(sql_escape "$ATTACHMENT_FILE")',manifest_file='$(sql_escape "$MANIFEST_FILE")',database_sha256='$DB_SHA',attachment_sha256='$ATTACHMENT_SHA',manifest_sha256='$MANIFEST_SHA',offsite_location=NULLIF('$(sql_escape "$offsite_location")',''),completed_at=now() WHERE backup_id='$(sql_escape "$BACKUP_ID")'" >/dev/null

find "$DEST" -mindepth 1 -maxdepth 1 -type d -mtime +"$RETENTION" -exec rm -rf {} +
trap - INT TERM HUP EXIT
echo "Backup completed: $BACKUP_ID"
