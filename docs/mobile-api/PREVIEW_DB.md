# Preview database (catalog only)

Use a **separate** Mongo database. Never point preview/`mobile-api` at production `sialkot_motorsports` on `sialkot-mongo`.

## Catalog collections to copy

| Collection | Purpose |
|------------|---------|
| `products` | Catalog |
| `categories` | Categories |
| `vehicles` | Fitment generations |
| `carcatalogs` | Shop-by-car catalog |
| `banners` | Hero / promo |
| `blogposts` | Blog |
| `pages` | CMS / policies |
| `settings` | Public settings (incl. `mobileApp`) |
| `shippingzones` | Delivery quote |
| `featuredmedias` | Home media strip |
| `coupons` | Optional for quote tests |

**Do not copy:** `customers`, `orders`, `cartsessions`, `loginattempts`, `customerrefreshtokens`, `mobiledevices`, `idempotencykeys`, `users`, `reviews` (optional).

## Safety rules

- Use **explicit namespace mapping** (`--nsFrom` / `--nsTo`) into `crazzycars_mobile_preview`.
- **Never** pass `--drop` against production (or against any restore that could touch `sialkot_motorsports`).
- Take a **backup of the target preview DB** before restore if it already has data.
- Dump is **read-only** on the source; restore only writes to the preview DB name.

## Step-by-step (VPS Docker Mongo)

1. SSH to the VPS.

2. **Backup** the preview DB if it already exists (skip if brand new empty name):

```bash
docker exec sialkot-mongo mongodump \
  --db=crazzycars_mobile_preview \
  --archive=/tmp/cc-preview-backup-$(date +%Y%m%d%H%M).archive
```

3. Dump **only** catalog collections from production (source DB untouched):

```bash
docker exec sialkot-mongo mongodump \
  --db=sialkot_motorsports \
  --collection=products \
  --collection=categories \
  --collection=vehicles \
  --collection=carcatalogs \
  --collection=banners \
  --collection=blogposts \
  --collection=pages \
  --collection=settings \
  --collection=shippingzones \
  --collection=featuredmedias \
  --collection=coupons \
  --archive=/tmp/cc-catalog.archive
```

If your mongodump build rejects multiple `--collection` flags, dump one collection at a time into `/tmp/cc-dump/` and restore from that directory with the same ns mapping.

4. Restore into the preview DB with **explicit namespace remap** (no `--drop`):

```bash
docker exec sialkot-mongo mongorestore \
  --nsInclude='sialkot_motorsports.*' \
  --nsFrom='sialkot_motorsports.*' \
  --nsTo='crazzycars_mobile_preview.*' \
  --archive=/tmp/cc-catalog.archive
```

If collections already exist in the preview DB and you need a clean replace **only on preview**, you may drop **that DB only** first:

```bash
# Preview DB only — NEVER run against sialkot_motorsports
docker exec sialkot-mongo mongosh crazzycars_mobile_preview --quiet --eval 'db.dropDatabase()'
```

Then re-run the `mongorestore` with ns mapping above.

5. **Scrub secrets** from Settings (required after every restore) — see below.

6. Point the preview Coolify app / local env at:

```text
mongodb://mobile_preview:<PASSWORD>@sialkot-mongo:27017/crazzycars_mobile_preview?authSource=crazzycars_mobile_preview
```

7. Set preview-only secrets: `MOBILE_JWT_SECRET`, `JWT_SECRET` (for any shared code paths). **Omit** `RESEND_API_KEY`, `FROM_EMAIL`, `META_CAPI_ACCESS_TOKEN`, `META_PIXEL_ID`, courier env keys.

8. Verify:

```bash
docker exec sialkot-mongo mongosh crazzycars_mobile_preview --quiet --eval '
print("products", db.products.countDocuments({}));
print("orders", db.orders.countDocuments({}));
print("customers", db.customers.countDocuments({}));
print("capi", db.settings.findOne({singletonKey:"default"},{"seo.metaCapiAccessToken":1,"courier.postexApiKey":1}));
'
```

Expect products > 0; orders/customers = 0; scrubbed secret fields empty/null.

## Settings secret-like fields (store `Settings` schema)

Unset these in preview after restore. Paths are under the settings singleton document.

| Path | Why |
|------|-----|
| `seo.metaCapiAccessToken` | Meta Conversions API token |
| `seo.metaCapiTestEventCode` | Meta CAPI test code |
| `seo.facebookPixelId` | Pixel ID (pairs with CAPI; clear in preview) |
| `seo.googleAnalyticsId` | Analytics property id |
| `seo.googleSearchConsoleId` | GSC verification / property |
| `courier.postexApiKey` | PostEx API token |
| `courier.postexAccountId` | PostEx account identifier |
| `courier.postexAddressCode` | PostEx pickup/address code |
| `pakistaniPaymentMethods.jazzcash.accountNumber` | Payment destination |
| `pakistaniPaymentMethods.jazzcash.accountName` | Payment destination |
| `pakistaniPaymentMethods.easypaisa.accountNumber` | Payment destination |
| `pakistaniPaymentMethods.easypaisa.accountName` | Payment destination |
| `pakistaniPaymentMethods.bankTransfer.accountNumber` | Bank account |
| `pakistaniPaymentMethods.bankTransfer.accountTitle` | Bank account |
| `pakistaniPaymentMethods.bankTransfer.iban` | Bank IBAN |
| `pakistaniPaymentMethods.hbl.accountNumber` | Bank account |
| `pakistaniPaymentMethods.hbl.accountTitle` | Bank account |
| `pakistaniPaymentMethods.meezan.accountNumber` | Bank account |
| `pakistaniPaymentMethods.meezan.accountTitle` | Bank account |
| `pakistaniPaymentMethods.meezan.iban` | Bank IBAN |
| `pakistaniPaymentMethods.ubl.accountNumber` | Bank account |
| `pakistaniPaymentMethods.ubl.accountTitle` | Bank account |
| `notifications.notificationEmail` | Ops inbox (optional scrub) |
| `payment.*` | Legacy Stripe/PayPal blobs if present in Mongo (`stripeSecretKey`, `stripePublishableKey`, `stripeWebhookSecret`, nested `stripe` / `paypal`) |

**Not in store Settings schema** (env-only — keep unset on preview app):

- `RESEND_API_KEY`, `FROM_EMAIL`, SMTP_* (order emails)
- `META_CAPI_ACCESS_TOKEN`, `META_PIXEL_ID`, `META_CAPI_TEST_EVENT_CODE`
- `MOBILE_JWT_SECRET` / `JWT_SECRET` — set to **preview-only** random values, never production

**Admin-only Settings** (if you ever copy admin settings into another DB): also scrub `courier.runCourierApiKey`, `courier.runCourierClientCode`, `courier.runCourierProfileId`, and any `social.*` page tokens. Storefront preview restore above does not include those fields on the store Settings model.

## Scrub script (run after every restore)

```bash
docker exec sialkot-mongo mongosh crazzycars_mobile_preview --quiet --eval '
const r = db.settings.updateMany(
  { singletonKey: "default" },
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
```

### Confirm order creation with Resend + CAPI unconfigured

Checkout / `createStoreOrder` **does not fail** when email/CAPI are missing:

- `lib/email.js` — if `RESEND_API_KEY` is unset, sends are skipped (`getResend()` returns null); errors are caught around customer/admin email calls.
- `lib/metaCapi.js` — `resolveMetaCapiConfig().enabled` is false unless both pixel id **and** access token are set; Purchase CAPI is skipped.

After scrub + omitting those env vars on the preview app, place a test COD order (web adapter or mobile place-order). Expect HTTP 200 and an `orders` document; logs may show `RESEND_API_KEY not set — emails disabled`.

Local A/B harness (`scripts/ab-checkout/run-ab.mjs`) clears Resend/CAPI env vars for both sides and seeds empty SEO tokens.

## Create a Mongo user restricted to `crazzycars_mobile_preview` only

```bash
docker exec -it sialkot-mongo mongosh admin --eval '
db.getSiblingDB("crazzycars_mobile_preview").createUser({
  user: "mobile_preview",
  pwd: passwordPrompt(),
  roles: [
    { role: "readWrite", db: "crazzycars_mobile_preview" }
  ]
})
'
```

## Indexes

New mobile collections get indexes via Mongoose autoIndex after first connect, or see `INDEXES.md`.

## A/B checkout characterization

```bash
cd scripts/ab-checkout
npm install
# uses mongodb-memory-server by default (never production)
node run-ab.mjs
# results → AB_RESULTS.json
```

---

## Local Mac restore → `crazzycars_local_real`

Use this when validating the **real** production catalog on the Android emulator. Mongo stays on localhost Docker (`27028`). Never point the laptop at production Mongo. Never write to production.

### Exact commands on the VPS (dump only — read-only)

SSH to the VPS, then create a **read-only** dump user if you do not already have one (one-time):

```bash
docker exec -it sialkot-mongo mongosh admin --eval '
db.getSiblingDB("sialkot_motorsports").createUser({
  user: "catalog_dump_ro",
  pwd: passwordPrompt(),
  roles: [ { role: "read", db: "sialkot_motorsports" } ]
})
'
```

Dump **catalog collections only** (no customers / orders / carts / sessions / tokens / users):

```bash
docker exec sialkot-mongo mongodump \
  --username=catalog_dump_ro \
  --password \
  --authenticationDatabase=sialkot_motorsports \
  --db=sialkot_motorsports \
  --collection=products \
  --collection=categories \
  --collection=vehicles \
  --collection=carcatalogs \
  --collection=banners \
  --collection=blogposts \
  --collection=pages \
  --collection=settings \
  --collection=shippingzones \
  --collection=featuredmedias \
  --collection=coupons \
  --archive=/tmp/cc-catalog.archive

docker cp sialkot-mongo:/tmp/cc-catalog.archive /tmp/cc-catalog.archive
ls -lh /tmp/cc-catalog.archive
```

If `mongodump` rejects multiple `--collection` flags, dump into a directory instead:

```bash
mkdir -p /tmp/cc-catalog-dump
for c in products categories vehicles carcatalogs banners blogposts pages settings shippingzones featuredmedias coupons; do
  docker exec sialkot-mongo mongodump \
    --username=catalog_dump_ro --password --authenticationDatabase=sialkot_motorsports \
    --db=sialkot_motorsports --collection="$c" --out=/tmp/cc-catalog-dump
done
docker cp sialkot-mongo:/tmp/cc-catalog-dump /tmp/cc-catalog-dump
# On the Mac, zip that folder and restore with mongorestore --dir=… (same ns remap)
```

### Copy archive to your Mac

From your Mac (replace `VPS_HOST`):

```bash
scp "USER@VPS_HOST:/tmp/cc-catalog.archive" ~/Desktop/cc-catalog.archive
```

### Restore locally (safe script)

Container `crazzycars-mongo-local-verify` must be running (`docs/LOCAL_VERIFY.md`). From the **server worktree** (`CCSMS-mobile-api`):

```bash
./scripts/restore-catalog-local.sh ~/Desktop/cc-catalog.archive
```

The script:

- Refuses any target DB name that does **not** contain `local`
- Refuses non-localhost hosts
- Drops **only** `crazzycars_local_real` (never production / `sialkot_motorsports`)
- Remaps `sialkot_motorsports.*` → `crazzycars_local_real.*`
- Runs the Settings secret scrub (Meta pixel/CAPI, email, courier keys, payment keys, webhooks)

Optional URL shape report (after restore):

```bash
MONGODB_URI='mongodb://127.0.0.1:27028/crazzycars_local_real' \
  node scripts/report-catalog-image-urls.mjs
```

### Point local backend at the real catalog (local `.env.local` only)

In `storecraft-store/.env.local` (never Coolify / production `.env`):

```bash
MONGODB_URI=mongodb://127.0.0.1:27028/crazzycars_local_real
MEDIA_PUBLIC_BASE_URL=https://crazzycars.pk
NEXT_PUBLIC_SITE_URL=https://crazzycars.pk
SITE_URL=https://crazzycars.pk
NEXT_PUBLIC_INDEXABLE=false
# Keep Resend / Meta / courier keys empty
```

`MEDIA_PUBLIC_BASE_URL=https://crazzycars.pk` makes the mobile API absolutize `/media/...` paths to public HTTPS so the emulator can load images without a local media volume.

See also `storecraft-store/.env.local.real.example`.
