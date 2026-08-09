#!/bin/sh
set -eu
ARCHIVE=${1:?Usage: migration-drill.sh system-release_xxx.tar.gz [report.json]}
REPORT=${2:-$(pwd)/migration-drill-report.json}
STAGE=$(mktemp -d)
START=$(date +%s)
cleanup(){ rm -rf "$STAGE"; }
trap cleanup EXIT INT TERM HUP
VERIFY=$("$(dirname "$0")/verify-release-package.sh" "$ARCHIVE" "$STAGE")
[ -f "$STAGE/index.html" ] || { echo "index.html is missing" >&2; exit 4; }
[ -f "$STAGE/pages/login.html" ] || { echo "login page is missing" >&2; exit 4; }
[ -f "$STAGE/data/build-manifest.js" ] || { echo "build manifest is missing" >&2; exit 4; }
JS_ERRORS=0
if command -v node >/dev/null 2>&1; then
  while IFS= read -r js; do node --check "$js" >/dev/null 2>&1 || JS_ERRORS=$((JS_ERRORS+1)); done <<EOF
$(find "$STAGE/assets/js" "$STAGE/data" -type f -name '*.js' 2>/dev/null)
EOF
fi
END=$(date +%s)
python3 - "$REPORT" "$VERIFY" "$JS_ERRORS" "$((END-START))" <<'PY'
import json,sys,datetime
out,verify,errors,duration=sys.argv[1:]
v=json.loads(verify)
report={'release':'part510','drillType':'full-migration','status':'passed' if int(errors)==0 else 'failed','generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'stagedRelease':v.get('release'),'fileCount':v.get('fileCount'),'totalBytes':v.get('totalBytes'),'javascriptSyntaxErrors':int(errors),'durationSeconds':int(duration),'productionChanged':False}
with open(out,'w',encoding='utf-8') as f:json.dump(report,f,ensure_ascii=False,indent=2)
print(json.dumps(report,ensure_ascii=False))
PY
[ "$JS_ERRORS" -eq 0 ]
