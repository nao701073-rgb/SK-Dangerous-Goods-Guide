#!/bin/sh
set -eu
SET_DIR=${1:?Usage: verify-backup.sh /backups/backup_YYYYMMDD_HHMMSS}
[ -d "$SET_DIR" ] || { echo "Backup set not found: $SET_DIR" >&2; exit 2; }
cd "$SET_DIR"
sha256sum -c SHA256SUMS
[ -f manifest.json ] || { echo "manifest.json is missing" >&2; exit 3; }
DB_FILE=$(sed -n 's/.*"databaseFile":"\([^"]*\)".*/\1/p' manifest.json)
ATTACHMENT_FILE=$(sed -n 's/.*"attachmentFile":"\([^"]*\)".*/\1/p' manifest.json)
[ -n "$DB_FILE" ] && [ -f "$DB_FILE" ] || { echo "Database backup is missing" >&2; exit 4; }
gzip -t "$DB_FILE"
if echo "$ATTACHMENT_FILE" | grep -q '\.tar\.gz$'; then
  tar -tzf "$ATTACHMENT_FILE" >/dev/null
else
  [ -f "$ATTACHMENT_FILE" ] || { echo "Attachment pointer is missing" >&2; exit 5; }
fi
echo "Backup verification passed: $SET_DIR"
