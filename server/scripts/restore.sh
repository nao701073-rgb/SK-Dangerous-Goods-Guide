#!/bin/sh
set -eu
SET_DIR=${1:?Usage: restore.sh /backups/backup_YYYYMMDD_HHMMSS}
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${ATTACHMENT_STORAGE_DIR:=${PHOTO_STORAGE_DIR:-/app/storage/attachments}}"
: "${RESTORE_CONFIRMATION:?Set RESTORE_CONFIRMATION=RESTORE_TO_TARGET after verifying the target environment}"
[ "$RESTORE_CONFIRMATION" = "RESTORE_TO_TARGET" ] || { echo "Invalid RESTORE_CONFIRMATION" >&2; exit 2; }
"$(dirname "$0")/verify-backup.sh" "$SET_DIR" >/dev/null
MANIFEST="$SET_DIR/manifest.json"
DB_FILE=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["databaseFile"])' "$MANIFEST")
ATT_FILE=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["attachmentFile"])' "$MANIFEST")
RELEASE_FILE=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1])).get("releaseFile") or "")' "$MANIFEST")
STAGE=$(mktemp -d)
cleanup(){ rm -rf "$STAGE"; }
trap cleanup EXIT INT TERM HUP

if [ "${RESTORE_SKIP_PRE_BACKUP:-false}" != "true" ]; then
  BACKUP_INCLUDE_SYSTEM_RELEASE=false "$(dirname "$0")/backup.sh"
fi

case "$DB_FILE" in
  *.dump) pg_restore --no-owner --no-privileges --clean --if-exists --dbname "$DATABASE_URL" "$SET_DIR/$DB_FILE" ;;
  *.sql.gz) gzip -dc "$SET_DIR/$DB_FILE" | psql "$DATABASE_URL" --set ON_ERROR_STOP=on ;;
  *) echo "Unsupported database backup: $DB_FILE" >&2; exit 5 ;;
esac

if echo "$ATT_FILE" | grep -q '\.tar\.gz$'; then
  mkdir -p "$STAGE/attachments"
  tar -xzf "$SET_DIR/$ATT_FILE" -C "$STAGE/attachments"
  OLD="${ATTACHMENT_STORAGE_DIR}.pre_restore_$(date -u +%Y%m%d_%H%M%S)"
  [ -d "$ATTACHMENT_STORAGE_DIR" ] && mv "$ATTACHMENT_STORAGE_DIR" "$OLD" || true
  mv "$STAGE/attachments" "$ATTACHMENT_STORAGE_DIR"
fi

if [ -n "$RELEASE_FILE" ] && [ "${RESTORE_STAGE_RELEASE:-true}" = "true" ]; then
  RELEASE_NAME=${RELEASE_FILE#system-release_}; RELEASE_NAME=${RELEASE_NAME%.tar.gz}
  RELEASE_DIR=${SYSTEM_MIGRATION_RELEASE_DIR:-/app/releases}
  mkdir -p "$RELEASE_DIR/$RELEASE_NAME"
  "$(dirname "$0")/verify-release-package.sh" "$SET_DIR/$RELEASE_FILE" "$RELEASE_DIR/$RELEASE_NAME" >/dev/null
  echo "Release staged at $RELEASE_DIR/$RELEASE_NAME. Activate separately after health checks."
fi

"$(dirname "$0")/integrity-check.sh"
echo "Restore completed and integrity check passed."
