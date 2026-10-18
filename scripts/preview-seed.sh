#!/usr/bin/env bash
# Restore a catalog-only mongodump archive into the PREVIEW Mongo container only.
#
# SELF-CONTAINED: copy this single file to the VPS and run it — no repo checkout required.
#
# SAFETY (hard-fail):
#   - Target container name must contain "preview" and must not look like sialkot/prod
#   - Target DB name must contain "preview" (default: crazzycars_store_preview)
#   - Refuses published ports on the preview Mongo container
#   - Archive collections must be a subset of the allowed catalog set (see below)
#   - Drops ONLY the preview DB inside the preview container
#   - Scrubs courier / Meta / social / analytics secrets; KEEPS public payment account lines
#
# Usage (on the VPS, after Coolify preview Mongo is up):
#   PREVIEW_MONGO_CONTAINER=crazzycars-preview-mongo \
#   PREVIEW_DB=crazzycars_store_preview \
#   SOURCE_DB=sialkot_motorsports \
#   ./preview-seed.sh /root/cc-catalog.archive
#
# Dry-run guards only (no Docker restore / no archive):
#   ./preview-seed.sh --dry-run-guard
#
set -euo pipefail

CONTAINER="${PREVIEW_MONGO_CONTAINER:-crazzycars-preview-mongo}"
PREVIEW_DB="${PREVIEW_DB:-crazzycars_store_preview}"
SOURCE_DB="${SOURCE_DB:-sialkot_motorsports}"
ARCHIVE="${1:-${ARCHIVE:-}}"

die() { echo "ERROR: $*" >&2; exit 1; }

# Optional auth for preview Mongo (Coolify often requires this).
# PREVIEW_MONGO_USER=store_preview PREVIEW_MONGO_PASSWORD=… PREVIEW_MONGO_AUTH_DB=crazzycars_store_preview
MONGO_AUTH_ARGS=()
if [[ -n "${PREVIEW_MONGO_USER:-}" ]]; then
  [[ -n "${PREVIEW_MONGO_PASSWORD:-}" ]] || die "PREVIEW_MONGO_USER set but PREVIEW_MONGO_PASSWORD is empty"
  MONGO_AUTH_ARGS+=(
    -u "$PREVIEW_MONGO_USER"
    -p "$PREVIEW_MONGO_PASSWORD"
    --authenticationDatabase "${PREVIEW_MONGO_AUTH_DB:-$PREVIEW_DB}"
  )
fi

# Allowed catalog collections only (refuse anything else in the archive).
ALLOWED_COLLECTIONS=(
  products
  categories
  vehicles
  carcatalogs
  banners
  blogposts
  pages
  shippingzones
  settings
  featuredmedias
  coupons
)

is_allowed_collection() {
  local c="$1"
  local a
  for a in "${ALLOWED_COLLECTIONS[@]}"; do
    [[ "$c" == "$a" ]] && return 0
  done
  return 1
}

run_guards() {
  local lower_c lower_db lower_src
  lower_c="$(printf '%s' "$CONTAINER" | tr '[:upper:]' '[:lower:]')"
  lower_db="$(printf '%s' "$PREVIEW_DB" | tr '[:upper:]' '[:lower:]')"
  lower_src="$(printf '%s' "$SOURCE_DB" | tr '[:upper:]' '[:lower:]')"

  [[ -n "$lower_c" ]] || die "PREVIEW_MONGO_CONTAINER is empty"
  [[ "$lower_c" != *sialkot* ]] || die "refusing production-like container name: $CONTAINER"
  [[ "$lower_c" == *preview* ]] || die "container name must contain \"preview\": $CONTAINER"

  [[ -n "$lower_db" ]] || die "PREVIEW_DB is empty"
  [[ "$lower_db" != sialkot_motorsports && "$lower_db" != sialkotmotorsports ]] \
    || die "refusing production DB name: $PREVIEW_DB"
  [[ "$lower_db" != *sialkot* && "$lower_db" != *prod* ]] \
    || die "refusing production-like DB name: $PREVIEW_DB"
  [[ "$lower_db" == *preview* ]] || die "PREVIEW_DB must contain \"preview\": $PREVIEW_DB"

  [[ "$lower_src" == *sialkot* ]] \
    || die "SOURCE_DB should be the production catalog DB name (sialkot_*), got $SOURCE_DB"

  if [[ -n "${MONGODB_URI:-}" ]]; then
    local uri_lc host dbpath
    uri_lc="$(printf '%s' "$MONGODB_URI" | tr '[:upper:]' '[:lower:]')"
    [[ "$uri_lc" != *sialkot-mongo* ]] || die "MONGODB_URI host looks like production (sialkot-mongo)"
    [[ "$uri_lc" != *sialkot_motorsports* && "$uri_lc" != *sialkotmotorsports* ]] \
      || die "MONGODB_URI path looks like production DB name"
    [[ "$uri_lc" == *preview* ]] || die "MONGODB_URI must contain \"preview\" in host or database name"
    # Best-effort host/db print (no Node required)
    host="$(printf '%s' "$MONGODB_URI" | sed -E 's#^mongodb(\+srv)?://([^@]+@)?([^:/]+).*#\3#')"
    dbpath="$(printf '%s' "$MONGODB_URI" | sed -E 's#^mongodb(\+srv)?://[^/]+/([^?]+).*#\2#')"
    echo "MONGODB_URI host=${host} db=${dbpath}"
  fi

  echo "Guards OK: container=${CONTAINER} previewDb=${PREVIEW_DB} sourceDb=${SOURCE_DB}"
}

# List unique collection names inside a mongodump --archive file (via dry-run restore).
list_archive_collections() {
  local archive="$1"
  # mongorestore dry-run writes chatter on stderr; parse db.collection tokens.
  docker exec -i "$CONTAINER" mongorestore "${MONGO_AUTH_ARGS[@]}" --archive --dryRun -v 2>&1 <"$archive" \
    | grep -oE '[A-Za-z0-9_]+\.[A-Za-z0-9_]+' \
    | awk -F. '{print $2}' \
    | grep -E '^[a-z][a-z0-9_]*$' \
    | sort -u
}

assert_archive_allowlist() {
  local archive="$1"
  local cols bad
  echo "==> Checking archive collections against allowlist…"
  cols="$(list_archive_collections "$archive" || true)"
  [[ -n "$(printf '%s' "$cols" | tr -d '[:space:]')" ]] \
    || die "Could not list any collections from archive (is the file a valid mongodump --archive?)"

  bad=""
  while IFS= read -r c; do
    [[ -n "$c" ]] || continue
    if ! is_allowed_collection "$c"; then
      bad="${bad}${c}"$'\n'
    fi
  done <<<"$cols"

  if [[ -n "$(printf '%s' "$bad" | tr -d '[:space:]')" ]]; then
    echo "ERROR: archive contains collections outside the allowed catalog set:" >&2
    printf '%s' "$bad" | sed '/^$/d;s/^/  - /' >&2
    echo "Allowed: ${ALLOWED_COLLECTIONS[*]}" >&2
    exit 1
  fi

  echo "==> Archive collections OK:"
  printf '%s\n' "$cols" | sed '/^$/d;s/^/  - /'
}

if [[ "${ARCHIVE}" == "--dry-run-guard" ]]; then
  run_guards
  exit 0
fi

[[ -n "$ARCHIVE" ]] || die "Pass archive path as arg 1, or ARCHIVE=..., or --dry-run-guard"
[[ -f "$ARCHIVE" ]] || die "Archive not found: $ARCHIVE"
ARCHIVE="$(cd "$(dirname "$ARCHIVE")" && pwd)/$(basename "$ARCHIVE")"

run_guards

docker inspect "$CONTAINER" >/dev/null 2>&1 || die "Container not running: $CONTAINER"

PUBLISHED="$(docker port "$CONTAINER" 2>/dev/null || true)"
if [[ -n "${PUBLISHED//[[:space:]]/}" ]]; then
  die "Preview Mongo has published ports (must be private). docker port output:
${PUBLISHED}"
fi

echo "==> Target container: $CONTAINER (preview only)"
echo "==> Target DB:        $PREVIEW_DB"
echo "==> Source DB remap:  $SOURCE_DB → $PREVIEW_DB"
echo "==> Archive:          $ARCHIVE"

assert_archive_allowlist "$ARCHIVE"

echo "==> Dropping ONLY ${PREVIEW_DB} inside ${CONTAINER}…"
docker exec "$CONTAINER" mongosh "${MONGO_AUTH_ARGS[@]}" "$PREVIEW_DB" --quiet --eval 'db.dropDatabase()'

echo "==> mongorestore → ${PREVIEW_DB} (stream archive; no docker cp)…"
docker exec -i "$CONTAINER" mongorestore "${MONGO_AUTH_ARGS[@]}" \
  --nsInclude="${SOURCE_DB}.*" \
  --nsFrom="${SOURCE_DB}.*" \
  --nsTo="${PREVIEW_DB}.*" \
  --archive <"$ARCHIVE"

echo "==> Scrubbing social / courier / Meta tokens (KEEPING public payment account lines)…"
docker exec "$CONTAINER" mongosh "${MONGO_AUTH_ARGS[@]}" "$PREVIEW_DB" --quiet --eval '
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
      "notifications.notificationEmail": "",
      "payment.stripe": "",
      "payment.paypal": "",
      "payment.stripeSecretKey": "",
      "payment.stripePublishableKey": "",
      "payment.stripeWebhookSecret": "",
      "payment.stripeEnabled": "",
      "social": "",
      "social.metaPageToken": "",
      "social.metaPageId": "",
      "social.instagramAccountId": "",
      "social.facebookPageId": "",
      "social.accessToken": "",
      "social.pageAccessToken": "",
      "social.igUserId": ""
    },
    $set: {
      "courier.autoCreateShipment": false
    }
  }
);
printjson(r);
const s = db.settings.findOne({}, {
  "pakistaniPaymentMethods.bankTransfer.accountNumber": 1,
  "pakistaniPaymentMethods.jazzcash.accountNumber": 1,
  "pakistaniPaymentMethods.easypaisa.accountNumber": 1,
  "pakistaniPaymentMethods.meezan.accountNumber": 1,
  "courier.autoCreateShipment": 1,
  "courier.postexApiKey": 1,
  "courier.runCourierApiKey": 1,
  "seo.metaCapiAccessToken": 1,
  "seo.facebookPixelId": 1,
  "social": 1
});
print("payment lines present (sample):", JSON.stringify({
  bank: s?.pakistaniPaymentMethods?.bankTransfer?.accountNumber ? "yes" : "missing",
  jazzcash: s?.pakistaniPaymentMethods?.jazzcash?.accountNumber ? "yes" : "missing",
  easypaisa: s?.pakistaniPaymentMethods?.easypaisa?.accountNumber ? "yes" : "missing",
  meezan: s?.pakistaniPaymentMethods?.meezan?.accountNumber ? "yes" : "missing",
}));
print("courier.autoCreateShipment", s?.courier?.autoCreateShipment);
print("courier.postexApiKey scrubbed", s?.courier?.postexApiKey == null || s?.courier?.postexApiKey === "");
print("courier.runCourierApiKey scrubbed", s?.courier?.runCourierApiKey == null || s?.courier?.runCourierApiKey === "");
print("seo.metaCapiAccessToken scrubbed", s?.seo?.metaCapiAccessToken == null || s?.seo?.metaCapiAccessToken === "");
print("seo.facebookPixelId scrubbed", s?.seo?.facebookPixelId == null || s?.seo?.facebookPixelId === "");
print("social scrubbed", s?.social == null);
'

echo "==> Verify counts…"
docker exec "$CONTAINER" mongosh "${MONGO_AUTH_ARGS[@]}" "$PREVIEW_DB" --quiet --eval '
print("products", db.products.countDocuments({}));
print("categories", db.categories.countDocuments({}));
print("banners", db.banners.countDocuments({}));
print("orders", db.orders.countDocuments({}));
print("customers", db.customers.countDocuments({}));
'

echo ""
echo "Done. Point Coolify crazzycars-store-preview at:"
echo "  MONGODB_URI=mongodb://store_preview:***@${CONTAINER}:27017/${PREVIEW_DB}?authSource=${PREVIEW_DB}"
echo "  PREVIEW_GUARD=1"
echo "  MEDIA_PUBLIC_BASE_URL=https://crazzycars.pk"
echo "  NEXT_PUBLIC_INDEXABLE=false"
echo "(Never edit production Coolify env for crazzycars.pk from this script.)"
