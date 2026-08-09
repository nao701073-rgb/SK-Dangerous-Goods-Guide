#!/bin/sh
set -eu
SET_DIR=${1:?Usage: restore-drill.sh /backups/backup_YYYYMMDD_HHMMSS [report.json]}
REPORT=${2:-"$SET_DIR/restore-drill-report.json"}
: "${DATABASE_URL:?DATABASE_URL is required}"
command -v pg_restore >/dev/null 2>&1 || { echo "pg_restore is required" >&2; exit 2; }
command -v createdb >/dev/null 2>&1 || { echo "createdb is required" >&2; exit 2; }
command -v dropdb >/dev/null 2>&1 || { echo "dropdb is required" >&2; exit 2; }

"$(dirname "$0")/verify-backup.sh" "$SET_DIR"
MANIFEST="$SET_DIR/manifest.json"
DB_FILE=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["databaseFile"])' "$MANIFEST")
ATT_FILE=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["attachmentFile"])' "$MANIFEST")
REL_FILE=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1])).get("releaseFile", ""))' "$MANIFEST")
STAMP=$(date -u +%Y%m%d%H%M%S)
DRILL_DB="iss_restore_drill_${STAMP}_$$"
DRILL_DIR=$(mktemp -d)
START=$(date +%s)
cleanup(){ dropdb --if-exists --maintenance-db="$DATABASE_URL" "$DRILL_DB" >/dev/null 2>&1 || true; rm -rf "$DRILL_DIR"; }
trap cleanup EXIT INT TERM HUP

createdb --maintenance-db="$DATABASE_URL" "$DRILL_DB"
BASE_URL=$(python3 - "$DATABASE_URL" "$DRILL_DB" <<'PY'
import sys,urllib.parse
u=urllib.parse.urlsplit(sys.argv[1]);path='/'+sys.argv[2]
print(urllib.parse.urlunsplit((u.scheme,u.netloc,path,u.query,u.fragment)))
PY
)
case "$DB_FILE" in
  *.dump) pg_restore --no-owner --no-privileges --clean --if-exists --dbname "$BASE_URL" "$SET_DIR/$DB_FILE" ;;
  *.sql.gz) gzip -dc "$SET_DIR/$DB_FILE" | psql "$BASE_URL" --set ON_ERROR_STOP=on ;;
  *) echo "Unsupported database backup: $DB_FILE" >&2; exit 5 ;;
esac

mkdir -p "$DRILL_DIR/attachments"
OBJECT_POINTER=0
case "$ATT_FILE" in
  *.tar.gz) tar -xzf "$SET_DIR/$ATT_FILE" -C "$DRILL_DIR/attachments" ;;
  *.json) OBJECT_POINTER=1 ;;
  *) echo "Unsupported attachment backup: $ATT_FILE" >&2; exit 6 ;;
esac

if [ -n "$REL_FILE" ]; then
  mkdir -p "$DRILL_DIR/release"
  "$(dirname "$0")/verify-release-package.sh" "$SET_DIR/$REL_FILE" "$DRILL_DIR/release" >/dev/null
fi

COUNTS=$(psql "$BASE_URL" -At -F ',' -c "SELECT json_build_object('users',(SELECT count(*) FROM users),'applications',(SELECT count(*) FROM applications),'photos',(SELECT count(*) FROM photos),'documents',(SELECT count(*) FROM application_documents),'results',(SELECT count(*) FROM application_linked_results));")
ORPHANS=$(psql "$BASE_URL" -Atc "SELECT count(*) FROM photos p LEFT JOIN applications a ON a.id=p.application_id WHERE a.id IS NULL;")
END=$(date +%s)
RTO=$((END-START))
python3 - "$REPORT" "$COUNTS" "$ORPHANS" "$RTO" "$DRILL_DB" "$OBJECT_POINTER" <<'PY'
import json,sys,datetime
out,counts,orphans,rto,db,object_pointer=sys.argv[1:]
try: parsed=json.loads(counts)
except Exception: parsed={'raw':counts}
report={'release':'part510','drillType':'isolated-restore','status':'passed' if int(orphans)==0 and int(object_pointer)==0 else 'warning','generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'temporaryDatabase':db,'rtoSeconds':int(rto),'counts':parsed,'orphanPhotos':int(orphans),'objectStorageRestoreRequiresProviderTest':bool(int(object_pointer)),'productionChanged':False}
with open(out,'w',encoding='utf-8') as f:json.dump(report,f,ensure_ascii=False,indent=2)
print(json.dumps(report,ensure_ascii=False))
PY
