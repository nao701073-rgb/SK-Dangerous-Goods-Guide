#!/bin/sh
set -eu
while true; do
  enabled=$(psql "$DATABASE_URL" -Atc "SELECT CASE WHEN enabled THEN 'true' ELSE 'false' END FROM system_backup_settings WHERE id='default'" 2>/dev/null || echo true)
  interval=$(psql "$DATABASE_URL" -Atc "SELECT interval_hours FROM system_backup_settings WHERE id='default'" 2>/dev/null || echo 24)
  if [ "$enabled" = "true" ]; then /app/scripts/backup.sh || true; fi
  sleep $((interval * 3600))
done
