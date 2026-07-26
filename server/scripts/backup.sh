#!/bin/sh
set -eu
STAMP=$(date +%Y%m%d_%H%M%S)
DEST=${BACKUP_DIR:-/backups}
RETENTION=${BACKUP_RETENTION_DAYS:-30}
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${PHOTO_STORAGE_DIR:=/app/storage/photos}"
mkdir -p "$DEST"
DB_FILE="$DEST/database_${STAMP}.sql.gz"
PHOTO_FILE="$DEST/photos_${STAMP}.tar.gz"
pg_dump "$DATABASE_URL" --no-owner --no-privileges | gzip > "$DB_FILE"
tar -czf "$PHOTO_FILE" -C "$PHOTO_STORAGE_DIR" .
sha256sum "$DB_FILE" "$PHOTO_FILE" > "$DEST/checksum_${STAMP}.sha256"
find "$DEST" -type f -mtime +"$RETENTION" -delete
echo "Backup completed: $STAMP"
