#!/bin/sh
set -eu
SET_DIR=${1:?Usage: verify-backup.sh /backups/backup_YYYYMMDD_HHMMSS}
[ -d "$SET_DIR" ] || { echo "Backup set not found: $SET_DIR" >&2; exit 2; }
cd "$SET_DIR"
sha256sum -c SHA256SUMS
[ -f manifest.json ] || { echo "manifest.json is missing" >&2; exit 3; }
FORMAT=$(python3 -c 'import json;print(json.load(open("manifest.json")).get("format",""))')
[ "$FORMAT" = "SK-ISS-BACKUP-SET" ] || { echo "Unsupported manifest format: $FORMAT" >&2; exit 3; }
# A pointer to object storage is not a restorable attachment backup.
PROVIDER=$(python3 -c 'import json;print(json.load(open("manifest.json")).get("storageProvider", ""))')
[ "$PROVIDER" = "filesystem" ] || { echo 'NON_FILESYSTEM_BACKUP_NOT_RESTORABLE' >&2; exit 5; }
DB_FILE=$(python3 -c 'import json;print(json.load(open("manifest.json"))["databaseFile"])')
ATTACHMENT_FILE=$(python3 -c 'import json;print(json.load(open("manifest.json"))["attachmentFile"])')
RELEASE_FILE=$(python3 -c 'import json;print(json.load(open("manifest.json")).get("releaseFile") or "")')
[ -n "$DB_FILE" ] && [ -f "$DB_FILE" ] || { echo "Database backup is missing" >&2; exit 4; }
case "$DB_FILE" in
  *.dump) pg_restore --list "$DB_FILE" >/dev/null ;;
  *.sql.gz) gzip -t "$DB_FILE" ;;
  *) echo "Unsupported database format: $DB_FILE" >&2; exit 4 ;;
esac
case "$ATTACHMENT_FILE" in
  *.tar.gz) [ -f "$ATTACHMENT_FILE" ] && tar -tzf "$ATTACHMENT_FILE" >/dev/null || { echo 'ATTACHMENT_ARCHIVE_MISSING_OR_INVALID' >&2; exit 5; } ;;
  *) echo 'ATTACHMENT_ARCHIVE_REQUIRED_NOT_POINTER' >&2; exit 5 ;;
esac
if [ -n "$RELEASE_FILE" ]; then
  [ -f "$RELEASE_FILE" ] || { echo "Release package is missing" >&2; exit 6; }
  "$(dirname "$0")/verify-release-package.sh" "$PWD/$RELEASE_FILE" >/dev/null
fi
printf '{"status":"passed","backupSet":"%s","database":"%s","attachments":"%s","release":"%s"}\n' "$SET_DIR" "$DB_FILE" "$ATTACHMENT_FILE" "$RELEASE_FILE"
