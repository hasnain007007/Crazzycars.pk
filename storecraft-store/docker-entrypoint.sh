#!/bin/sh
# Ensure MEDIA_ROOT exists (Coolify volume may be empty on first boot).
set -eu
MEDIA_ROOT="${MEDIA_ROOT:-/app/media}"
mkdir -p "$MEDIA_ROOT" 2>/dev/null || true

# Preview Coolify app only: refuse to boot against production Mongo.
# Set PREVIEW_GUARD=1 on crazzycars-store-preview — never on crazzycars.pk.
if [ "${PREVIEW_GUARD:-0}" = "1" ]; then
  if [ -f /app/assert-preview-mongo.mjs ]; then
    node /app/assert-preview-mongo.mjs
  elif [ -f /app/scripts/assert-preview-mongo.mjs ]; then
    node /app/scripts/assert-preview-mongo.mjs
  else
    echo "PREVIEW_GUARD=1 but assert-preview-mongo.mjs missing from image" >&2
    exit 1
  fi
fi

exec "$@"
