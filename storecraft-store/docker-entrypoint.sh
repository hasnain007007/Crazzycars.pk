#!/bin/sh
# Ensure MEDIA_ROOT exists (Coolify volume may be empty on first boot).
set -eu
MEDIA_ROOT="${MEDIA_ROOT:-/app/media}"
mkdir -p "$MEDIA_ROOT" 2>/dev/null || true
exec "$@"
