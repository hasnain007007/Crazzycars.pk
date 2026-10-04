# Local mobile API verification (no production)

Use this to run the storefront against a **local MongoDB** and hit it from the Expo app on your phone (same Wi‑Fi). Never point these steps at `crazzycars.pk`.

## 1. Start local Mongo

```bash
docker run -d --name crazzycars-mongo-local-verify \
  -p 27028:27017 mongo:7
```

Database name: `crazzycars_local_verify` (must contain `local` or `verify`).

## 2. Storefront env

In `storecraft-store/`:

```bash
cp .env.local.verify.example .env.local
# Edit JWT_SECRET and MOBILE_JWT_SECRET:
openssl rand -hex 48   # paste twice
```

Confirm:

- `MONGODB_URI=mongodb://127.0.0.1:27028/crazzycars_local_verify`
- `NEXT_PUBLIC_INDEXABLE=false`
- `RESEND_API_KEY`, Meta, PostEx, RunCourier keys are **empty**

## 3. Seed catalog

From the **server worktree** root (`CCSMS-mobile-api`):

```bash
MONGODB_URI='mongodb://127.0.0.1:27028/crazzycars_local_verify' \
  node scripts/seed-local-catalog.mjs
```

The script **refuses** non-localhost hosts and DB names without `local`/`verify`.

## 4. Start storefront on the LAN

```bash
cd storecraft-store
# Worktree may symlink node_modules; use webpack if Turbopack panics:
npx next dev --webpack -H 0.0.0.0 -p 3000
```

## 5. Automated API checklist

```bash
cd ..   # worktree root
BASE_URL=http://127.0.0.1:3000 \
MONGODB_URI=mongodb://127.0.0.1:27028/crazzycars_local_verify \
  node scripts/verify-mobile-api.mjs
```

Optional 31s refresh case: `VERIFY_SLOW=1`.

Redacted bodies land in `docs/mobile-api/REAL_RESPONSES.md`.

## 6. Find your Mac’s LAN IP

```bash
ipconfig getifaddr en0
# or: ipconfig getifaddr en1
```

Example: `192.168.1.3`.

Confirm the phone can reach it:

```bash
# on Mac
curl -sS -o /dev/null -w '%{http_code}\n' http://192.168.1.3:3000/api/mobile/v1/config
```

## 7. Point the mobile app at the LAN API

In `crazzycars-mobile/.env` (or `.env.local`):

```bash
EXPO_PUBLIC_API_MODE=live
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.3:3000
```

Restart Expo (`npx expo start -c`). Phone and Mac must be on the **same Wi‑Fi**. iOS may block cleartext HTTP — if so, use a tunnel or enable ATS exception for local LAN only.

## 8. Mobile contract smoke

```bash
cd crazzycars-mobile
npm run smoke -- http://127.0.0.1:3000
SMOKE_WRITE=1 npm run smoke -- http://127.0.0.1:3000
```

`SMOKE_WRITE` refuses production hosts; localhost is allowed.

## Safety

- Seed + verify scripts refuse production-like URIs/hosts.
- Fake payment account lines and WhatsApp `03000000000` only.
- No Resend / Meta CAPI / courier keys in local verify.
