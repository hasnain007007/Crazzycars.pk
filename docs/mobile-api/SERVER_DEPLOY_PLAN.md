# Server deploy plan — `mobile-api-clean` → production

Work in the **CCSMS-mobile-api** worktree. Merge into **`vps-test`** (Coolify production branch for `crazzycars.pk` / `admin.crazzycars.pk`). **No force-push.** Never point preview tools at production casually.

This agent does **not** run Coolify, mongodump against your VPS, or production curls. Commands below are for **you**.

---

## 1. Pre-requisites

### 1.1 Production Mongo backup (`mongodump`)

SSH to the VPS, then (adjust container/DB names if yours differ — production DB is historically `sialkot_motorsports` on `sialkot-mongo`):

```bash
docker exec sialkot-mongo mongodump \
  --db=sialkot_motorsports \
  --archive=/tmp/cc-prod-backup-$(date +%Y%m%d%H%M).archive \
  --gzip

# Copy off the box to safe storage
docker cp sialkot-mongo:/tmp/cc-prod-backup-YYYYMMDDHHMM.archive.gz ~/backups/
```

Confirm the archive size is non-trivial before continuing.

### 1.2 Coolify branch bindings

In Coolify UI, confirm:

| App | Domain | Git branch must be |
|-----|--------|--------------------|
| Storefront | `crazzycars.pk` | `vps-test` |
| Admin | `admin.crazzycars.pk` | `vps-test` |

Preview / mobile-api apps (if any) must **not** use the production Mongo URI.

---

## 2. Env vars to set on **production store** Coolify app **BEFORE** deploy

Generate secrets locally (do not paste into git):

```bash
openssl rand -hex 64   # → MOBILE_JWT_SECRET
```

| Variable | Required | Notes |
|----------|----------|-------|
| `MOBILE_JWT_SECRET` | Recommended | Separate from `JWT_SECRET`. If missing, a separate key is derived from `JWT_SECRET` (HMAC-SHA256, `lib/mobile/jwtSecret.js`); setting it later signs out app users once. |
| `JWT_SECRET` | Already set | Unchanged — web cookies only |
| Existing store secrets | Keep | Mongo, Resend, Meta CAPI, couriers, etc. |

Optional Settings (admin / DB `settings.mobileApp`, not env): `minVersion*`, `recommendedVersionIos`, `recommendedVersionAndroid`, store listing URLs.

**Do not** set preview-only scrubbed blanks on production.

---

## 3. Merge strategy into `vps-test`

From a clean machine with both remotes:

```bash
cd /path/to/CCSMS-mobile-api
git fetch origin
git checkout mobile-api-clean
git push -u origin mobile-api-clean   # if not already on GitHub

# Open PR into vps-test (no force-push)
gh pr create --base vps-test --head mobile-api-clean \
  --title "Mobile API + account-deletion page" \
  --body "Additive mobile /api/mobile/v1 + /account-deletion. See docs/mobile-api/SERVER_DEPLOY_PLAN.md."

# After review / CI:
gh pr merge --merge    # or squash if that is your norm — still no force-push
```

If `vps-test` moved ahead:

```bash
git checkout mobile-api-clean
git fetch origin
git rebase origin/vps-test
# fix conflicts, then
git push origin mobile-api-clean   # only if not force; if rebase needs force, prefer merge commit instead of force-pushing shared branches
```

Prefer **merge commit or squash via PR** over rewriting `vps-test` history.

Coolify should auto-deploy `vps-test`. Watch the deploy logs; manually trigger only if the webhook did not start.

---

## 4. Suggested low-traffic window

Deploy in a **low-order window** for Pakistan retail (e.g. late night / early morning PKT on a weekday). Announce internally: avoid admin catalog mass-edits during the deploy.

---

## 5. New collections’ indexes in production

New collections (created on first use):

- `customerrefreshtokens`
- `mobiledevices`
- `idempotencykeys`

**How indexes appear:** Mongoose `autoIndex` (default) builds **missing** indexes when the store process connects and loads models (`docs/mobile-api/INDEXES.md`).

### WARNING — never run `syncIndexes()` on existing models

`Model.syncIndexes()` **can drop indexes** that exist in Mongo but are not in the schema. That is dangerous on mature collections (`orders`, `products`, `customers`, …).

**Allowed:** `syncIndexes()` **only** on the three new mobile models, against production, if autoIndex did not create them:

```bash
# On a one-off prod shell with production MONGODB_URI — ONLY these three
node --input-type=module <<'EOF'
import { dbConnect } from './lib/db.js';
import CustomerRefreshToken from './lib/models/CustomerRefreshToken.model.js';
import MobileDevice from './lib/models/MobileDevice.model.js';
import IdempotencyKey from './lib/models/IdempotencyKey.model.js';
await dbConnect();
console.log('refresh', await CustomerRefreshToken.syncIndexes());
console.log('devices', await MobileDevice.syncIndexes());
console.log('idempo', await IdempotencyKey.syncIndexes());
process.exit(0);
EOF
```

**Never** call `syncIndexes()` in a loop over `registerModels` / all models.

Verify:

```bash
docker exec sialkot-mongo mongosh sialkot_motorsports --quiet --eval '
printjson(db.customerrefreshtokens.getIndexes());
printjson(db.mobiledevices.getIndexes());
printjson(db.idempotencykeys.getIndexes());
'
```

---

## 6. Post-deploy checks

### 6.1 Real web COD order

Place one low-value COD order on the **website** (not only mobile). Confirm admin shows it and stock/order flow looks normal.

### 6.2 Admin click-through

1. Orders list loads  
2. Open the order  
3. Change status once (e.g. pending → confirmed) and save  

### 6.3 Read-only mobile curl list

Use production host **only after deploy**, read-only GETs:

```bash
BASE=https://crazzycars.pk

curl -sS "$BASE/api/mobile/v1/config" | jq '{success,minVersionAndroid,recommendedVersionAndroid,recommendedVersionIos}'
curl -sS "$BASE/api/mobile/v1/home" | jq '{success,keys:(.data|keys)}'
curl -sS "$BASE/api/mobile/v1/categories" | jq '{success,count:(.data|length)}'
curl -sS "$BASE/api/mobile/v1/products?limit=2" | jq '{success,count:(.data.items|length)}'
curl -sS "$BASE/api/mobile/v1/faq" | jq '{success,count:(.items|length)}'
```

Expect HTTP 200 and `success`/documented shapes (see `API_CONTRACT.md` / `BATCH3_CURL.md`).

### 6.4 Account deletion page

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://crazzycars.pk/account-deletion
# Expect 200
```

### 6.5 Robots check

```bash
curl -sS https://crazzycars.pk/robots.txt | head
# Confirm nothing newly blocks critical store paths unintentionally
```

---

## 7. Rollback plan

1. Coolify → redeploy previous **known-good** `vps-test` commit (or revert the merge PR with a new revert commit — **no force-push**).  
2. If mobile auth is broken but web is fine: unset or fix `MOBILE_JWT_SECRET`; web cookie JWT is separate.  
3. New collections can remain empty; they do not block web checkout.  
4. Restore Mongo **only** if data corruption occurred (use the pre-deploy `mongodump`). Prefer not to restore for app-only bugs.

---

## 8. Rate limits vs Traefik for `/api/mobile/v1`

**App-level:** Mongo `LoginAttempt` / `actionRateLimit` already covers mobile login, register, contact, track, devices (and checkout path limits). See `PHASE_0_5_IMPLEMENTATION.md`.

**Traefik-level:** Not strictly required for first production enablement if app limits are live. **Recommended later** for anonymous GETs (`/products`, `/faq`, `/home`) that are cheap to scrape: add Coolify/Traefik rate middlewares on `/api/mobile/v1` if you see abusive traffic. Do not rely on Traefik alone for auth brute-force — keep Mongo limits.

**Verdict for launch:** ship with existing Mongo rate limits; add Traefik only if monitoring shows need.
