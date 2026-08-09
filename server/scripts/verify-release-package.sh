#!/bin/sh
set -eu
ARCHIVE=${1:?Usage: verify-release-package.sh system-release_xxx.tar.gz [staging-dir]}
STAGE=${2:-$(mktemp -d)}
OWN_STAGE=0
[ "$#" -ge 2 ] || OWN_STAGE=1
cleanup(){ [ "$OWN_STAGE" -eq 1 ] && rm -rf "$STAGE" || true; }
trap cleanup EXIT INT TERM HUP
mkdir -p "$STAGE"
tar -xzf "$ARCHIVE" -C "$STAGE"
MANIFEST="$STAGE/.part510-release-manifest.tmp"
[ -f "$MANIFEST" ] || { echo "Release manifest is missing" >&2; exit 3; }
python3 - "$STAGE" "$MANIFEST" <<'PY'
import hashlib,json,os,sys
root,manifest_path=sys.argv[1:]
with open(manifest_path,encoding='utf-8') as f:m=json.load(f)
errors=[]
for item in m.get('files',[]):
    p=os.path.join(root,item['path'])
    if not os.path.isfile(p): errors.append(f"missing:{item['path']}"); continue
    size=os.path.getsize(p)
    if size!=item['size']: errors.append(f"size:{item['path']}:{size}!={item['size']}")
    h=hashlib.sha256()
    with open(p,'rb') as fh:
        for chunk in iter(lambda:fh.read(1024*1024),b''):h.update(chunk)
    if h.hexdigest()!=item['sha256']:errors.append(f"sha256:{item['path']}")
if errors:
    print('\n'.join(errors),file=sys.stderr);sys.exit(4)
print(json.dumps({'status':'passed','release':m.get('release'),'fileCount':len(m.get('files',[])),'totalBytes':m.get('totalBytes')},ensure_ascii=False))
PY
