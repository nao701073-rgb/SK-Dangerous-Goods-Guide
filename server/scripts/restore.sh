#!/bin/sh
set -eu
if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <database.sql.gz> <photos.tar.gz>" >&2
  exit 1
fi
DB_BACKUP="$1"
PHOTO_BACKUP="$2"
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${PHOTO_STORAGE_DIR:=/app/storage/photos}"
echo "Restoring database..."
gzip -dc "$DB_BACKUP" | psql "$DATABASE_URL" --set ON_ERROR_STOP=on
echo "Restoring photos..."
mkdir -p "$PHOTO_STORAGE_DIR"
tar -xzf "$PHOTO_BACKUP" -C "$PHOTO_STORAGE_DIR"
echo "Restore completed. Run integrity-check.sh next."
