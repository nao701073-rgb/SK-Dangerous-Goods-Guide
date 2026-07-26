#!/bin/sh
set -eu
CERT_PATH="${1:-/etc/nginx/certs/server.crt}"
WARN_DAYS="${TLS_WARN_DAYS:-30}"
openssl x509 -checkend "$((WARN_DAYS*86400))" -noout -in "$CERT_PATH" || {
  echo "TLS certificate expires within ${WARN_DAYS} days." >&2
  exit 2
}
echo "TLS certificate validity is sufficient."
