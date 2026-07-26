#!/bin/sh
set -eu
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${AUDIT_RETENTION_DAYS:=365}"
psql "$DATABASE_URL" --set ON_ERROR_STOP=on -c "DELETE FROM audit_logs WHERE created_at < now() - interval '${AUDIT_RETENTION_DAYS} days';"
