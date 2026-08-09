#!/bin/sh
set -eu
RELEASE_DIR=${SYSTEM_MIGRATION_RELEASE_DIR:-/app/releases}
CURRENT_LINK=${SYSTEM_CURRENT_RELEASE_LINK:-/app/current}
TARGET=${1:?Usage: activate-release.sh <release-name> [health-url]}
HEALTH_URL=${2:-${SYSTEM_HEALTH_URL:-}}
TARGET_PATH="$RELEASE_DIR/$TARGET"
[ -d "$TARGET_PATH" ] || { echo "Release not found: $TARGET_PATH" >&2; exit 2; }
[ -f "$TARGET_PATH/index.html" ] || { echo "index.html missing in release" >&2; exit 3; }
PREVIOUS=""
[ -L "$CURRENT_LINK" ] && PREVIOUS=$(readlink "$CURRENT_LINK" || true)
ln -sfn "$TARGET_PATH" "${CURRENT_LINK}.next"
mv -Tf "${CURRENT_LINK}.next" "$CURRENT_LINK"
if [ -n "$HEALTH_URL" ]; then
  if ! curl -fsS --max-time 20 "$HEALTH_URL" >/dev/null; then
    if [ -n "$PREVIOUS" ]; then ln -sfn "$PREVIOUS" "${CURRENT_LINK}.rollback" && mv -Tf "${CURRENT_LINK}.rollback" "$CURRENT_LINK"; fi
    echo "Health check failed; rolled back" >&2; exit 4
  fi
fi
printf '{"status":"activated","target":"%s","previous":"%s","currentLink":"%s"}\n' "$TARGET_PATH" "$PREVIOUS" "$CURRENT_LINK"
