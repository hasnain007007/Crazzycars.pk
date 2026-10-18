# Preview deploy — `crazzycars-store-preview` (isolated)

**Branch:** `mobile-api-clean`  
**Production:** do **not** change Coolify apps for `crazzycars.pk` / `admin.crazzycars.pk`, and do **not** point anything at `sialkot-mongo` / `sialkot_motorsports`.

**Do not push `mobile-api-clean` until you confirm the Vercel Git integration for `storecraft-store-iota` is disconnected.** That project is still live and publicly serving the store; a GitHub push would likely trigger a Vercel preview build.

Related: [PREVIEW_DB.md](./PREVIEW_DB.md), [OPS-PRODUCTION-DATABASE.md](../OPS-PRODUCTION-DATABASE.md), `scripts/preview-seed.sh`, `storecraft-store/scripts/assert-preview-mongo.mjs`.

---

## Proposed URLs / names

| Resource | Proposed name |
|----------|----------------|
| Coolify application | `crazzycars-store-preview` |
| Git branch (auto-deploy) | `mobile-api-clean` **only** |
| Public URL (**HTTPS required**) | `https://store-preview.crazzycars.pk` |
| Coolify-generated fallback | Coolify `*.sslip.io` (or similar) **with TLS enabled** — Android release builds reject cleartext HTTP |
| Preview Mongo **container** | `crazzycars-preview-mongo` (**not** `sialkot-mongo`) |
| Preview Mongo **DB name** | `crazzycars_store_preview` |
| Preview Mongo volume | `crazzycars-preview-mongo-data` (persistent, private) |

Mobile EAS `preview` profile will use this **HTTPS** origin as `EXPO_PUBLIC_API_BASE_URL` (Phase 4).

---

## 0. Check VPS RAM/disk **before** building

SSH to the VPS and confirm headroom so a second Next.js build does not OOM the host that already runs production:

```bash
free -h
df -h /
docker system df
```

**Guidelines (soft):**

| Resource | Prefer before starting preview build |
|----------|--------------------------------------|
| Free RAM | ≥ 1.5–2 GB available (or swap ready) |
| Free disk | ≥ 5 GB on `/` (image layers + Next build cache) |

If RAM is tight: stop unused Coolify resources temporarily, prune dangling images (`docker image prune` — **not** volumes), or set a low build concurrency. Do **not** kill `sialkot-mongo` or the production store/admin containers.

---

## A. Create a NEW Mongo container (Coolify) — before the store app

Do this as a **separate** Coolify resource. It must **not** reuse `sialkot-mongo`.

### Click-by-click (Coolify UI)

1. Open Coolify → your VPS server (the one that already runs crazzycars.pk).
2. **+ New** → **Database** → **MongoDB** (or Docker Compose empty).
3. Name: `crazzycars-preview-mongo`.
4. Image: official `mongo:7` (or same major as production).
5. **Persistent volume:** enable; e.g. `crazzycars-preview-mongo-data` → `/data/db`.
6. **Ports:** **no public / published port**. Confirm Coolify shows no host port mapping for `27017`.
7. Set a strong password; store it outside git.
8. Deploy / start. Confirm healthy in Coolify logs.
9. Note the **internal hostname** (often `crazzycars-preview-mongo`).

### Confirm: no published port + shared network

On the VPS after Mongo is up:

```bash
# Must print nothing (or only empty) — no 0.0.0.0:27017 style publish
docker port crazzycars-preview-mongo

# Note networks (preview store app must join the SAME network later)
docker inspect crazzycars-preview-mongo \
  --format '{{json .NetworkSettings.Networks}}' | python3 -m json.tool
```

### Create the preview database user (SSH once)

```bash
docker exec -it crazzycars-preview-mongo mongosh admin -u root -p --eval '
db.getSiblingDB("crazzycars_store_preview").createUser({
  user: "store_preview",
  pwd: passwordPrompt(),
  roles: [ { role: "readWrite", db: "crazzycars_store_preview" } ]
})
'
```

URI shape (Docker-internal only):

```text
mongodb://store_preview:<PASSWORD>@crazzycars-preview-mongo:27017/crazzycars_store_preview?authSource=crazzycars_store_preview
```

---

## B. New Coolify application — store preview

### Click-by-click

1. Coolify → **+ New** → **Application** → same GitHub repo as production store.
2. Name: `crazzycars-store-preview`.
3. **Branch:** `mobile-api-clean` (not `vps-test` / `main`).
4. **Auto-deploy:** **ON** for **`mobile-api-clean` only**.
5. Confirm production apps remain on **`vps-test`** and are untouched.
6. **Build pack:** Dockerfile.
7. **Base directory:** `storecraft-store`.
8. **Dockerfile:** `Dockerfile`.
9. **Port:** `3000`.
10. **Memory limit (required):** set a Coolify / Docker memory limit so the preview app cannot starve production (suggested **1024–1536 MB** for the running container; lower if the VPS is small — raise only if the healthcheck OOMs). Also cap build memory if Coolify exposes a build-limit control.
11. **Domains / TLS (HTTPS required):**
    - Preferred: DNS **A** (or CNAME) for `store-preview.crazzycars.pk` → Coolify proxy, Let’s Encrypt / Coolify TLS **on**.
    - Or Coolify-generated `*.sslip.io` (etc.) with **HTTPS** enabled.
    - Do **not** hand Android a `http://` origin — release builds reject cleartext.
12. **Network:** attach the app to the **same Coolify/Docker network** as `crazzycars-preview-mongo` so the hostname resolves. Confirm:

```bash
# After first deploy — networks must overlap with preview mongo
docker inspect <crazzycars-store-preview-container> \
  --format '{{json .NetworkSettings.Networks}}' | python3 -m json.tool
```

13. **Volumes:** optional empty `/app/media`; prefer `MEDIA_PUBLIC_BASE_URL=https://crazzycars.pk` for images. Do not mount production Mongo data.
14. **Healthcheck:** image default.

Do **not** enable auto-deploy of `mobile-api-clean` on production store/admin.

---

## C. Environment variables (preview app only)

```bash
openssl rand -hex 64   # → MOBILE_JWT_SECRET (never production)
openssl rand -hex 64   # → JWT_SECRET (preview-only)
```

### Required / set

| Variable | Value | Notes |
|----------|--------|------|
| `MONGODB_URI` | `mongodb://store_preview:…@crazzycars-preview-mongo:27017/crazzycars_store_preview?authSource=crazzycars_store_preview` | Preview Mongo only |
| `PREVIEW_GUARD` | `1` | Boot guard refuses prod Mongo |
| `MOBILE_JWT_SECRET` | **new** random | Never production |
| `JWT_SECRET` | **new** random | Preview-only |
| `MEDIA_PUBLIC_BASE_URL` | `https://crazzycars.pk` | Absolutize `/media/…` |
| `MEDIA_ROOT` | `/app/media` | |
| `NEXT_PUBLIC_INDEXABLE` | `false` | robots / noindex |
| `NEXT_PUBLIC_SITE_URL` | `https://store-preview.crazzycars.pk` | **https://** |
| `SITE_URL` | same | |
| `NEXT_PUBLIC_STORE_URL` | same | |
| `NEXT_PUBLIC_APP_URL` | same | |
| `NEXT_PUBLIC_APP_NAME` / `NEXT_PUBLIC_STORE_NAME` | `Crazzycars.pk` | |
| `NEXT_PUBLIC_WHATSAPP` | public WhatsApp digits | wa.me in payment instructions |
| `NODE_ENV` | `production` | |

### Must be empty / unset

| Variable | Why |
|----------|-----|
| `RESEND_API_KEY`, `FROM_EMAIL`, `FROM_NAME`, `ADMIN_EMAIL` | No email |
| `SMTP_*` | No SMTP |
| `META_CAPI_ACCESS_TOKEN`, `META_PIXEL_ID`, `META_CAPI_TEST_EVENT_CODE` | No CAPI |
| `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | No signed uploads |
| `CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_CLOUDINARY_*` | Optional empty |
| `POSTEX_*`, `RUN_COURIER_*` | No courier ship |
| `SHOPIFY_STOREFRONT_ACCESS_TOKEN` | No Shopify |
| Production cron/revalidate secrets | Prefer new randoms or unset |

### Settings after seed (`scripts/preview-seed.sh`)

- **Keep** public `pakistaniPaymentMethods` bank/wallet lines (JazzCash / Easypaisa / Alfalah / Meezan).
- **Unset** courier API keys / Meta CAPI / analytics IDs in Settings.
- Force `courier.autoCreateShipment=false`.

---

## D. Prove isolation

```bash
cd /Users/mac/Desktop/CCSMS-mobile-api/storecraft-store
MONGODB_URI='mongodb://store_preview:…@crazzycars-preview-mongo:27017/crazzycars_store_preview?authSource=crazzycars_store_preview' \
  node scripts/assert-preview-mongo.mjs
```

Expect `PREVIEW_GUARD OK`. With `PREVIEW_GUARD=1`, a bad URI prevents container start.

```bash
# HTTPS only
curl -sS "https://store-preview.crazzycars.pk/api/mobile/v1/config" | head -c 400
```

---

## E. Phase gates

| Gate | Status |
|------|--------|
| **Gate 1** | Doc approved; **wait for Vercel Git disconnect** before any push |
| **Phase 2 local** | `scripts/preview-seed.sh` + tests + dump command (this commit set) — **no push** |
| **Gate 2** | You dump on VPS; seed into preview Mongo only |
| Phase 3 | `VERIFY_SLOW=1` against HTTPS preview URL |
| Phase 4 | EAS preview APK commands (you log in to Expo) |

---

## F. Safety checklist

- [ ] Vercel `storecraft-store-iota` Git integration **disconnected** (before push)  
- [ ] VPS RAM/disk checked (§0)  
- [ ] Preview app memory limit set  
- [ ] Preview URL is **HTTPS** (A/CNAME + TLS or sslip.io TLS)  
- [ ] Production Coolify still on `vps-test`  
- [ ] Preview auto-deploy = `mobile-api-clean` only  
- [ ] Mongo = `crazzycars-preview-mongo`, **`docker port` empty**  
- [ ] Preview app + Mongo share the **same** Docker network  
- [ ] `PREVIEW_GUARD=1`, new `MOBILE_JWT_SECRET`  
- [ ] Courier/Resend/Meta/Cloudinary signing keys empty  
- [ ] `MEDIA_PUBLIC_BASE_URL=https://crazzycars.pk`, `NEXT_PUBLIC_INDEXABLE=false`  

---

## Gate 2 — exact dump command (VPS) + where to put the file

Confirm the live DB name first:

```bash
docker exec sialkot-mongo mongosh --quiet --eval \
  'db.adminCommand({listDatabases:1}).databases.map(d=>d.name)'
```

Ops docs use `sialkot_motorsports`. If listDatabases shows `sialkotmotorsports`, substitute that as `SOURCE_DB`.

### Dump (read-only on production; stream to host `/root` — no `docker cp`, no writing into `sialkot-mongo` FS)

Run on the VPS as root. `--archive` (no path) writes the dump to **stdout**; redirect on the **host** into `/root/cc-catalog.archive`.

```bash
SOURCE_DB=sialkot_motorsports   # or sialkotmotorsports — match listDatabases

docker exec sialkot-mongo mongodump \
  -d "$SOURCE_DB" \
  --excludeCollection=orders \
  --excludeCollection=customers \
  --excludeCollection=cartsessions \
  --excludeCollection=users \
  --excludeCollection=loginattempts \
  --excludeCollection=reviews \
  --excludeCollection=invoices \
  --excludeCollection=receipts \
  --excludeCollection=activitylogs \
  --excludeCollection=redirects \
  --excludeCollection=postexwebhooklogs \
  --excludeCollection=aiagentvisits \
  --excludeCollection=dailyvisitors \
  --excludeCollection=livepresences \
  --excludeCollection=stockalerts \
  --excludeCollection=carmodels \
  --excludeCollection=productoptions \
  --excludeCollection=customerrefreshtokens \
  --excludeCollection=mobiledevices \
  --excludeCollection=idempotencykeys \
  --excludeCollection=abandonedcarts \
  --excludeCollection=settlements \
  --excludeCollection=couriersettlementbatches \
  --excludeCollection=couriersettlementlines \
  --excludeCollection=importbatches \
  --excludeCollection=runcourierwebhooklogs \
  --excludeCollection=socialposts \
  --excludeCollection=socialsettings \
  --archive > /root/cc-catalog.archive

chmod 600 /root/cc-catalog.archive
ls -lh /root/cc-catalog.archive
```

**Put the file at:** `/root/cc-catalog.archive` on the VPS (mode `600`).  
Do **not** use `docker cp`, `/tmp` inside `sialkot-mongo`, or `--archive=/tmp/...` inside the container.

Optional copy to your Mac:

```bash
scp root@YOUR_VPS:/root/cc-catalog.archive ~/Desktop/cc-catalog.archive
chmod 600 ~/Desktop/cc-catalog.archive
```

### Seed into preview Mongo only

`scripts/preview-seed.sh` is **self-contained** — copy that one file to the VPS if needed:

```bash
# e.g. scp scripts/preview-seed.sh root@YOUR_VPS:/root/preview-seed.sh
chmod +x /root/preview-seed.sh

PREVIEW_MONGO_CONTAINER=crazzycars-preview-mongo \
PREVIEW_DB=crazzycars_store_preview \
SOURCE_DB=sialkot_motorsports \
PREVIEW_MONGO_USER=store_preview \
PREVIEW_MONGO_PASSWORD='…' \
PREVIEW_MONGO_AUTH_DB=crazzycars_store_preview \
/root/preview-seed.sh /root/cc-catalog.archive
```


The script:

- Refuses `sialkot-mongo` / production DB names / published Mongo ports  
- Lists archive collections via `mongorestore --dryRun` and **refuses** anything outside  
  `products, categories, vehicles, carcatalogs, banners, blogposts, pages, shippingzones, settings, featuredmedias, coupons`  
- Streams restore with `docker exec -i … --archive < file` (no `docker cp`)  
- Scrubs courier / Meta / **social** tokens; **keeps** public payment account lines  
- Forces `courier.autoCreateShipment=false`

Dry-run guards (no Docker restore):

```bash
./scripts/preview-seed.sh --dry-run-guard
```
