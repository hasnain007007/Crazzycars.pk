#!/usr/bin/env bash
# Restore a catalog-only mongodump archive into a NEW local DB (default: crazzycars_local_real).
#
# SAFETY (hard-fail):
#   - Target DB name MUST contain "local"
#   - Mongo host MUST be localhost / 127.0.0.1
#   - Refuses production-looking names (sialkot_motorsports, etc.)
#   - --drop / dropDatabase ONLY on the target local DB
#   - Runs Settings secret scrub after restore
#
# Prerequisites:
#   - Docker container `crazzycars-mongo-local-verify` on host port 27028 (see docs/LOCAL_VERIFY.md)
#   - Catalog archive created on the VPS (see docs/mobile-api/PREVIEW_DB.md § Local Mac restore)
#
# Usage:
#   ./scripts/restore-catalog-local.sh /path/to/cc-catalog.archive
#   TARGET_DB=crazzycars_local_real ARCHIVE=./cc-catalog.archive ./scripts/restore-catalog-local.sh
#
set -euo pipefail

CONTAINER="${MONGO_CONTAINER:-crazzycars-mongo-local-verify}"
TARGET_DB="${TARGET_DB:-crazzycars_local_real}"
SOURCE_DB="${SOURCE_DB:-sialkot_motorsports}"
HOST_PORT="${MONGO_HOST_PORT:-27028}"
ARCHIVE="${1:-${ARCHIVE:-}}"

die() { echo "ERROR: $*" >&2; exit 1; }

[[ -n "$ARCHIVE" ]] || die "Pass archive path as arg 1 or ARCHIVE=..."
[[ -f "$ARCHIVE" ]] || die "Archive not found: $ARCHIVE"

ARCHIVE="$(cd "$(dirname "$ARCHIVE")" && pwd)/$(basename "$ARCHIVE")"

# --- safety: DB name ---
TARGET_LOWER="$(printf '%s' "$TARGET_DB" | tr '[:upper:]' '[:lower:]')"
[[ "$TARGET_LOWER" == *local* ]] || die "Refusing DB name without \"local\": $TARGET_DB"
[[ "$TARGET_LOWER" != *sialkot* ]] || die "Refusing production-like DB name: $TARGET_DB"
[[ "$TARGET_LOWER" != sialkot_motorsports ]] || die "Refusing production DB name"
[[ "$TARGET_LOWER" != *prod* ]] || die "Refusing DB name containing prod: $TARGET_DB"

# --- safety: host (URI override must still be local) ---
MONGO_URI="${MONGODB_URI:-mongodb://127.0.0.1:${HOST_PORT}}"
# Strip credentials for host check
URI_FOR_PARSE="$(printf '%s' "$MONGO_URI" | sed -E 's#^mongodb(\+srv)?://([^@]+@)?#http://#')"
HOST="$(printf '%s' "$URI_FOR_PARSE" | sed -E 's#^https?://([^:/]+).*#\1#' | tr '[:upper:]' '[:lower:]')"
[[ "$HOST" == "localhost" || "$HOST" == "127.0.0.1" ]] || die "Refusing non-localhost host: $HOST"

docker inspect "$CONTAINER" >/dev/null 2>&1 || die "Container not running: $CONTAINER (see docs/LOCAL_VERIFY.md)"

echo "==> Target DB: $TARGET_DB (local only)"
echo "==> Archive:   $ARCHIVE"
echo "==> Container: $CONTAINER"

REMOTE_ARCHIVE="/tmp/cc-catalog-restore-$$.archive"
docker cp "$ARCHIVE" "${CONTAINER}:${REMOTE_ARCHIVE}"

cleanup() {
  docker exec "$CONTAINER" rm -f "$REMOTE_ARCHIVE" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "==> Dropping ONLY ${TARGET_DB} (never production)…"
docker exec "$CONTAINER" mongosh "$TARGET_DB" --quiet --eval 'db.dropDatabase()'

echo "==> mongorestore → ${TARGET_DB} (ns remap from ${SOURCE_DB})…"
# No --drop here: we already dropped the target DB only.
docker exec "$CONTAINER" mongorestore \
  --nsInclude="${SOURCE_DB}.*" \
  --nsFrom="${SOURCE_DB}.*" \
  --nsTo="${TARGET_DB}.*" \
  --archive="$REMOTE_ARCHIVE"

echo "==> Scrubbing Settings secrets on ${TARGET_DB}…"
docker exec "$CONTAINER" mongosh "$TARGET_DB" --quiet --eval '
const r = db.settings.updateMany(
  {},
  {
    $unset: {
      "seo.metaCapiAccessToken": "",
      "seo.metaCapiTestEventCode": "",
      "seo.facebookPixelId": "",
      "seo.googleAnalyticsId": "",
      "seo.googleSearchConsoleId": "",
      "courier.postexApiKey": "",
      "courier.postexAccountId": "",
      "courier.postexAddressCode": "",
      "courier.runCourierApiKey": "",
      "courier.runCourierClientCode": "",
      "courier.runCourierProfileId": "",
      "pakistaniPaymentMethods.jazzcash.accountNumber": "",
      "pakistaniPaymentMethods.jazzcash.accountName": "",
      "pakistaniPaymentMethods.easypaisa.accountNumber": "",
      "pakistaniPaymentMethods.easypaisa.accountName": "",
      "pakistaniPaymentMethods.bankTransfer.accountNumber": "",
      "pakistaniPaymentMethods.bankTransfer.accountTitle": "",
      "pakistaniPaymentMethods.bankTransfer.iban": "",
      "pakistaniPaymentMethods.hbl.accountNumber": "",
      "pakistaniPaymentMethods.hbl.accountTitle": "",
      "pakistaniPaymentMethods.meezan.accountNumber": "",
      "pakistaniPaymentMethods.meezan.accountTitle": "",
      "pakistaniPaymentMethods.meezan.iban": "",
      "pakistaniPaymentMethods.ubl.accountNumber": "",
      "pakistaniPaymentMethods.ubl.accountTitle": "",
      "notifications.notificationEmail": "",
      "payment.stripe": "",
      "payment.paypal": "",
      "payment.stripeSecretKey": "",
      "payment.stripePublishableKey": "",
      "payment.stripeWebhookSecret": "",
      "payment.stripeEnabled": ""
    },
    $set: {
      "courier.autoCreateShipment": false
    }
  }
);
printjson(r);
'

echo "==> Verify counts…"
docker exec "$CONTAINER" mongosh "$TARGET_DB" --quiet --eval '
print("products", db.products.countDocuments({}));
print("categories", db.categories.countDocuments({}));
print("banners", db.banners.countDocuments({}));
print("blogposts", db.blogposts.countDocuments({}));
print("orders", db.orders.countDocuments({}));
print("customers", db.customers.countDocuments({}));
const s = db.settings.findOne({}, {"seo.metaCapiAccessToken":1,"courier.postexApiKey":1,"notifications.notificationEmail":1});
print("scrub sample", JSON.stringify(s));
'

echo ""
echo "Done. Point storecraft-store/.env.local at:"
echo "  MONGODB_URI=mongodb://127.0.0.1:${HOST_PORT}/${TARGET_DB}"
echo "  MEDIA_PUBLIC_BASE_URL=https://crazzycars.pk"
echo "  NEXT_PUBLIC_SITE_URL=https://crazzycars.pk"
echo "  SITE_URL=https://crazzycars.pk"
echo "(Never edit production Coolify env from this machine.)"
echo "Optional image URL report:"
echo "  MONGODB_URI=mongodb://127.0.0.1:${HOST_PORT}/${TARGET_DB} node scripts/report-catalog-image-urls.mjs"
