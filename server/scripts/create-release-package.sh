#!/bin/bash
set -eu

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
  ! -path '*/server/.env' \
  ! -path '*/server/.env.*.local' \
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
  'excluded':['.git','node_modules','server/.env*','server/storage','migration-staging','releases','public-release','backups','*.log'],
  'files':files
}
with open(out,'w',encoding='utf-8') as f: json.dump(payload,f,ensure_ascii=False,indent=2)
PY

cp "$MANIFEST" "$SOURCE_DIR/.part510-release-manifest.tmp"
trap 'rm -f "$SOURCE_DIR/.part510-release-manifest.tmp"; rm -rf "$WORK_DIR"' EXIT INT TERM HUP
# Use a deterministic file list so unexpected files cannot enter the archive.
cut -f1 "$FILE_LIST" > "$WORK_DIR/archive-files.txt"
printf '%s\n' '.part510-release-manifest.tmp' >> "$WORK_DIR/archive-files.txt"
tar -czf "$ARCHIVE" -C "$SOURCE_DIR" -T "$WORK_DIR/archive-files.txt"
rm -f "$SOURCE_DIR/.part510-release-manifest.tmp"
trap 'rm -rf "$WORK_DIR"' EXIT INT TERM HUP

ARCHIVE_SHA=$(sha256sum "$ARCHIVE" | awk '{print $1}')
cp "$MANIFEST" "$OUTPUT_DIR/system-release_${RELEASE}.manifest.json"
printf '%s  %s\n' "$ARCHIVE_SHA" "$(basename "$ARCHIVE")" > "$OUTPUT_DIR/system-release_${RELEASE}.sha256"
printf '{"release":"%s","archive":"%s","sha256":"%s","fileCount":%s,"totalBytes":%s}\n' "$RELEASE" "$ARCHIVE" "$ARCHIVE_SHA" "$FILE_COUNT" "$TOTAL_BYTES"
