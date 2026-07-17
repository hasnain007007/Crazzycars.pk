#!/usr/bin/env bash
# Deploy storecraft-admin + storecraft-store to VPS via rsync, then build & restart pm2.
# Run from your Mac: ./scripts/deploy-vps.sh
# You will be prompted for the VPS root password (twice: rsync + ssh).

set -euo pipefail

VPS_HOST="${VPS_HOST:-root@89.116.39.237}"
VPS_STORE_PATH="${VPS_STORE_PATH:-/var/www/storecraft-store}"
VPS_ADMIN_PATH="${VPS_ADMIN_PATH:-/var/www/storecraft-admin}"
# Default: CCSMS repo. Override: DEPLOY_ROOT=/Users/mac/Desktop/Ecommerce ./scripts/deploy-vps.sh
ROOT="${DEPLOY_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"

RSYNC_EXCLUDES=(
  --exclude='.next'
  --exclude='node_modules'
  --exclude='.git'
  --exclude='.env.local'
  --exclude='.vercel'
)

echo "==> Syncing storefront: $ROOT/storecraft-store -> $VPS_HOST:$VPS_STORE_PATH"
rsync -avz "${RSYNC_EXCLUDES[@]}" \
  "$ROOT/storecraft-store/" \
  "$VPS_HOST:$VPS_STORE_PATH/"

echo "==> Syncing admin: $ROOT/storecraft-admin -> $VPS_HOST:$VPS_ADMIN_PATH"
rsync -avz "${RSYNC_EXCLUDES[@]}" \
  "$ROOT/storecraft-admin/" \
  "$VPS_HOST:$VPS_ADMIN_PATH/"

echo "==> Building & restarting on VPS..."
ssh "$VPS_HOST" bash -s <<'REMOTE'
set -euo pipefail
export NODE_ENV=production

if [ -d /var/www/storecraft-store ]; then
  echo "--- storecraft-store ---"
  cd /var/www/storecraft-store
  npm ci --omit=dev 2>/dev/null || npm install --omit=dev
  npm run build
  pm2 restart storecraft-store || pm2 start npm --name storecraft-store -- start
fi

if [ -d /var/www/storecraft-admin ]; then
  echo "--- storecraft-admin ---"
  cd /var/www/storecraft-admin
  npm ci --omit=dev 2>/dev/null || npm install --omit=dev
  npm run build
  pm2 restart storecraft-admin || pm2 start npm --name storecraft-admin -- start
fi

pm2 save
pm2 list
REMOTE

echo "==> Deploy finished."
