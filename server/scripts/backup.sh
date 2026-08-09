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
SOURCE_DIR=${SYSTEM_RELEASE_SOURCE_DIR:-/app/public}
INCLUDE_RELEASE=${BACKUP_INCLUDE_SYSTEM_RELEASE:-true}
mkdir -p "$SET_DIR"

sql_escape() { printf "%s" "$1" | sed "s/'/''/g"; }
record_failure() {
  code=$?
  message="backup command failed with exit code $code"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=0 -c "UPDATE system_backup_runs SET status='failed',completed_at=now(),error_message='$(sql_escape "$message")' WHERE backup_id='$(sql_escape "$BACKUP_ID")'" >/dev/null 2>&1 || true
  exit "$code"
}
trap record_failure INT TERM HUP EXIT

psql "$DATABASE_URL" --set ON_ERROR_STOP=on -c "INSERT INTO system_backup_runs(backup_id,status,storage_location,created_by,release_version) VALUES('$(sql_escape "$BACKUP_ID")','running','$(sql_escape "$SET_DIR")','scheduler','Part 510') ON CONFLICT(backup_id) DO NOTHING" >/dev/null

DB_FILE="$SET_DIR/database.dump"
ATTACHMENT_FILE="$SET_DIR/attachments.tar.gz"
MANIFEST_FILE="$SET_DIR/manifest.json"
RELEASE_FILE=""
pg_dump "$DATABASE_URL" --format=custom --compress=9 --no-owner --no-privileges --file "$DB_FILE"

if [ "$PROVIDER" = "filesystem" ]; then
  mkdir -p "$ATTACHMENT_DIR"
  tar -czf "$ATTACHMENT_FILE" -C "$ATTACHMENT_DIR" .
else
  ATTACHMENT_FILE="$SET_DIR/attachments-object-storage-pointer.json"
  cat > "$ATTACHMENT_FILE" <<EOF
{"provider":"$PROVIDER","bucket":"${S3_BUCKET:-}","prefix":"${S3_PREFIX:-inspection-support}","note":"Object storage must have versioning, retention and an independent copy enabled."}
EOF
fi

if [ "$INCLUDE_RELEASE" = "true" ] && [ -d "$SOURCE_DIR" ]; then
  RELEASE_JSON=$(SYSTEM_RELEASE_VERSION="part510_${STAMP}" "$(dirname "$0")/create-release-package.sh" "$SOURCE_DIR" "$SET_DIR")
  RELEASE_FILE=$(python3 -c 'import json,sys,os;print(os.path.basename(json.loads(sys.argv[1])["archive"]))' "$RELEASE_JSON")
fi

DB_SHA=$(sha256sum "$DB_FILE" | awk '{print $1}')
ATTACHMENT_SHA=$(sha256sum "$ATTACHMENT_FILE" | awk '{print $1}')
RELEASE_SHA=""
[ -n "$RELEASE_FILE" ] && RELEASE_SHA=$(sha256sum "$SET_DIR/$RELEASE_FILE" | awk '{print $1}')
ROW_COUNTS=$(psql "$DATABASE_URL" -Atc "SELECT json_build_object('users',(SELECT count(*) FROM users),'applications',(SELECT count(*) FROM applications),'photos',(SELECT count(*) FROM photos),'documents',(SELECT count(*) FROM application_documents),'results',(SELECT count(*) FROM application_linked_results));")
ATTACHMENT_COUNT=$(find "$ATTACHMENT_DIR" -type f 2>/dev/null | wc -l | tr -d ' ')
RELEASE_COUNT=0
if [ -n "$RELEASE_FILE" ]; then RELEASE_COUNT=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["fileCount"])' "$SET_DIR/${RELEASE_FILE%.tar.gz}.manifest.json"); fi

python3 - "$MANIFEST_FILE" "$BACKUP_ID" "$PROVIDER" "$(basename "$DB_FILE")" "$(basename "$ATTACHMENT_FILE")" "$DB_SHA" "$ATTACHMENT_SHA" "$RELEASE_FILE" "$RELEASE_SHA" "$ROW_COUNTS" "$ATTACHMENT_COUNT" "$RELEASE_COUNT" <<'PY'
import json,sys,datetime
(out,bid,provider,db,att,dbsha,attsha,release,relsha,counts,attcount,relcount)=sys.argv[1:]
try: row_counts=json.loads(counts)
except Exception: row_counts={}
payload={'format':'SK-ISS-BACKUP-SET','schemaVersion':'2.0','backupId':bid,'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'storageProvider':provider,'databaseFile':db,'attachmentFile':att,'databaseSha256':dbsha,'attachmentSha256':attsha,'releaseFile':release or None,'releaseSha256':relsha or None,'systemVersion':'Part 510','rowCounts':row_counts,'fileCounts':{'attachments':int(attcount),'releaseFiles':int(relcount)},'secretsIncluded':False}
with open(out,'w',encoding='utf-8') as f:json.dump(payload,f,ensure_ascii=False,indent=2)
PY
MANIFEST_SHA=$(sha256sum "$MANIFEST_FILE" | awk '{print $1}')
sha256sum "$DB_FILE" "$ATTACHMENT_FILE" "$MANIFEST_FILE" > "$SET_DIR/SHA256SUMS"
[ -n "$RELEASE_FILE" ] && sha256sum "$SET_DIR/$RELEASE_FILE" "$SET_DIR/${RELEASE_FILE%.tar.gz}.manifest.json" "$SET_DIR/${RELEASE_FILE%.tar.gz}.sha256" >> "$SET_DIR/SHA256SUMS"

offsite_location=""
if [ -n "${OFFSITE_BACKUP_COMMAND:-}" ]; then
  export BACKUP_SET_DIR="$SET_DIR" BACKUP_ID
  sh -c "$OFFSITE_BACKUP_COMMAND"
  offsite_location=${OFFSITE_BACKUP_LOCATION:-configured-command}
fi

psql "$DATABASE_URL" --set ON_ERROR_STOP=on -c "UPDATE system_backup_runs SET status='completed',database_file='$(sql_escape "$DB_FILE")',attachment_file='$(sql_escape "$ATTACHMENT_FILE")',manifest_file='$(sql_escape "$MANIFEST_FILE")',database_sha256='$DB_SHA',attachment_sha256='$ATTACHMENT_SHA',manifest_sha256='$MANIFEST_SHA',release_file=NULLIF('$(sql_escape "$RELEASE_FILE")',''),release_sha256=NULLIF('$RELEASE_SHA',''),release_version='Part 510',row_counts='$(sql_escape "$ROW_COUNTS")'::jsonb,file_counts=jsonb_build_object('attachments',$ATTACHMENT_COUNT,'releaseFiles',$RELEASE_COUNT),offsite_location=NULLIF('$(sql_escape "$offsite_location")',''),completed_at=now() WHERE backup_id='$(sql_escape "$BACKUP_ID")'" >/dev/null

find "$DEST" -mindepth 1 -maxdepth 1 -type d -mtime +"$RETENTION" -exec rm -rf {} +
trap - INT TERM HUP EXIT
echo "Backup completed: $BACKUP_ID"
