#!/bin/bash
# R65 v43 backup correction: fail when any stage in a file-list pipeline fails.
set -euo pipefail

SOURCE_DIR=${1:-${SYSTEM_RELEASE_SOURCE_DIR:-/app/public}}
OUTPUT_DIR=${2:-${SYSTEM_RELEASE_OUTPUT_DIR:-/tmp/system-release}}
RELEASE=${SYSTEM_RELEASE_VERSION:-$(date -u +%Y%m%d_%H%M%S)}

[ -d "$SOURCE_DIR" ] || { echo "Source directory not found: $SOURCE_DIR" >&2; exit 2; }
mkdir -p "$OUTPUT_DIR"
WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT INT TERM HUP
MANIFEST="$WORK_DIR/release-manifest.json"
FILE_LIST="$WORK_DIR/files.tsv"
ARCHIVE="$OUTPUT_DIR/system-release_${RELEASE}.tar.gz"

# Secrets, mutable uploads, caches and generated backup areas are never included.
find "$SOURCE_DIR" -type f \
  ! -path '*/.git/*' \
  ! -path '*/node_modules/*' \
  ! -name '.env' \
  ! -name '.env.*' \
  ! -name '*.pem' \
  ! -name '*.pfx' \
  ! -name '*.p12' \
  ! -name '*.key' \
  ! -path '*/server/storage/*' \
  ! -path '*/server/data/migration-staging/*' \
  ! -path '*/server/data/releases/*' \
  ! -path '*/server/data/public-release/*' \
  ! -path '*/backups/*' \
  ! -name '*.log' \
  -print0 | sort -z | while IFS= read -r -d '' file; do
    rel=${file#"$SOURCE_DIR"/}
    size=$(wc -c < "$file" | tr -d ' ')
    sha=$(sha256sum "$file" | awk '{print $1}')
    printf '%s\t%s\t%s\n' "$rel" "$size" "$sha"
  done > "$FILE_LIST"

FILE_COUNT=$(wc -l < "$FILE_LIST" | tr -d ' ')
# Do not generate a success-looking archive containing only a synthetic manifest.
if [ "$FILE_COUNT" -eq 0 ]; then
  echo 'RELEASE_SOURCE_HAS_NO_ELIGIBLE_FILES' >&2
  exit 48
fi
TOTAL_BYTES=$(awk -F '\t' '{s+=$2} END{print s+0}' "$FILE_LIST")
FILES_SHA=$(sha256sum "$FILE_LIST" | awk '{print $1}')
GENERATED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)

python3 - "$FILE_LIST" "$MANIFEST" "$RELEASE" "$GENERATED_AT" "$FILE_COUNT" "$TOTAL_BYTES" "$FILES_SHA" <<'PY'
import json,sys
src,out,release,generated,count,total,files_sha=sys.argv[1:]
files=[]
with open(src,encoding='utf-8') as f:
    for line in f:
        path,size,sha=line.rstrip('\n').split('\t')
        files.append({'path':path,'size':int(size),'sha256':sha})
payload={
  'format':'SK-ISS-SYSTEM-RELEASE',
  'schemaVersion':'1.0',
  'release':release,
  'generatedAt':generated,
  'fileCount':int(count),
  'totalBytes':int(total),
  'fileListSha256':files_sha,
  'excluded':['.git','node_modules','.env*','*.pem','*.pfx','*.p12','*.key','server/storage','migration-staging','releases','public-release','backups','*.log'],
  'files':files
}
with open(out,'w',encoding='utf-8') as f: json.dump(payload,f,ensure_ascii=False,indent=2)
PY

# Keep source immutable; the generated manifest belongs to the temporary working dir.
cp "$MANIFEST" "$WORK_DIR/.part510-release-manifest.tmp"
cut -f1 "$FILE_LIST" > "$WORK_DIR/archive-files.txt"
# GNU tar applies -C to subsequent names, including the generated temporary manifest.
tar -czf "$ARCHIVE" -C "$SOURCE_DIR" -T "$WORK_DIR/archive-files.txt" -C "$WORK_DIR" .part510-release-manifest.tmp

ARCHIVE_SHA=$(sha256sum "$ARCHIVE" | awk '{print $1}')
cp "$MANIFEST" "$OUTPUT_DIR/system-release_${RELEASE}.manifest.json"
printf '%s  %s\n' "$ARCHIVE_SHA" "$(basename "$ARCHIVE")" > "$OUTPUT_DIR/system-release_${RELEASE}.sha256"
printf '{"release":"%s","archive":"%s","sha256":"%s","fileCount":%s,"totalBytes":%s}\n' "$RELEASE" "$ARCHIVE" "$ARCHIVE_SHA" "$FILE_COUNT" "$TOTAL_BYTES"
