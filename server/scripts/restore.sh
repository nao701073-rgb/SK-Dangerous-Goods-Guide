#!/bin/sh
set -eu
if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <database.sql.gz> <attachments.tar.gz>" >&2
  exit 1
fi
DB_BACKUP="$1"
ATTACHMENT_BACKUP="$2"
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${ATTACHMENT_STORAGE_DIR:=${PHOTO_STORAGE_DIR:-/app/storage/photos}}"
echo "Restoring database..."
gzip -dc "$DB_BACKUP" | psql "$DATABASE_URL" --set ON_ERROR_STOP=on
echo "Restoring attachments..."
case "$ATTACHMENT_BACKUP" in
  *.json) echo "Object-storage pointer backups must be restored with the storage provider version/replication procedure." >&2; exit 2 ;;
esac
mkdir -p "$ATTACHMENT_STORAGE_DIR"
tar -xzf "$ATTACHMENT_BACKUP" -C "$ATTACHMENT_STORAGE_DIR"
echo "Restore completed. Run integrity-check.sh next."
