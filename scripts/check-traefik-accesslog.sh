#!/usr/bin/env bash
# Check that coolify-proxy still has Traefik accesslog flags.
# Intended for nightly cron on the crazzycars VPS (see docs/OPS-PROXY-ACCESSLOG.md).
# Exit 0 = OK; exit 1 = missing flags / container down.
set -euo pipefail

CONTAINER="${TRAEFIK_CONTAINER:-coolify-proxy}"
LOG_FILE="${TRAEFIK_ACCESS_LOG:-/data/coolify/proxy/logs/access.log}"
STAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
  echo "${STAMP} ALERT coolify-proxy container missing"
  exit 1
fi

CMD="$(docker inspect "$CONTAINER" --format '{{json .Config.Cmd}}' 2>/dev/null || true)"
MISSING=0

for flag in \
  '--accesslog=true' \
  '--accesslog.filepath=/traefik/logs/access.log' \
  '--accesslog.format=json' \
  '--accesslog.bufferingSize=100'
do
  if ! printf '%s' "$CMD" | grep -Fq "$flag"; then
    echo "${STAMP} ALERT missing Traefik flag: $flag"
    MISSING=1
  fi
done

if [[ ! -d "$(dirname "$LOG_FILE")" ]]; then
  echo "${STAMP} ALERT access log directory missing: $(dirname "$LOG_FILE")"
  MISSING=1
fi

if [[ "$MISSING" -ne 0 ]]; then
  echo "${STAMP} ALERT Traefik accesslog drift — re-apply flags from docs/OPS-PROXY-ACCESSLOG.md"
  echo "${STAMP} current Cmd: $CMD"
  exit 1
fi

echo "${STAMP} OK Traefik accesslog flags present on ${CONTAINER}"
exit 0
