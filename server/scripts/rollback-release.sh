#!/bin/sh
set -eu
CURRENT_LINK=${SYSTEM_CURRENT_RELEASE_LINK:-/app/current}
PREVIOUS=${1:?Usage: rollback-release.sh <previous-release-path>}
[ -d "$PREVIOUS" ] || { echo "Previous release not found: $PREVIOUS" >&2; exit 2; }
ln -sfn "$PREVIOUS" "${CURRENT_LINK}.rollback"
mv -Tf "${CURRENT_LINK}.rollback" "$CURRENT_LINK"
printf '{"status":"rolled-back","current":"%s"}\n' "$PREVIOUS"
