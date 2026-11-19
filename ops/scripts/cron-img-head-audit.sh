#!/usr/bin/env bash
# Nightly / post-deploy image HEAD audit for crazzycars.pk.
# Install example (VPS crontab):
#   15 3 * * * /data/crazzycars/repo/ops/scripts/cron-img-head-audit.sh >> /var/log/crazzycars-img-audit.log 2>&1
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT_DIR="${OUT_DIR:-/data/crazzycars/reports}"
mkdir -p "$OUT_DIR"
STAMP="$(date -u +%Y-%m-%d)"
OUT="$OUT_DIR/img-head-audit-$STAMP.json"
cd "$ROOT"
BASE_URL="${BASE_URL:-https://crazzycars.pk}" OUT="$OUT" node ops/scripts/audit-img-variant-heads.mjs
# Non-zero exit when any <img> media URL 404s (see script).
