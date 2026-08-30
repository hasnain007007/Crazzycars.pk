# Homefy.pk — Independent Coolify + Vercel

Homefy is **not** CrazzyCars. Separate Mongo, separate host projects, separate domains, separate ship branch.

| | Homefy | CrazzyCars (do not touch) |
|--|--|--|
| Git branch | **`homefy-dev`** | `vps-test` |
| Mongo | `cluster0.g8tmzmx…` / DB **`homefy_pk`** | `yg8dcwr` / `sialkot_motorsports` |
| Coolify apps | **New** `homefy-pk-store` + `homefy-pk-admin` | `storecraft-store` / `storecraft-admin` (UUIDs below) |
| Vercel projects | **`homefy-pk-store`** + **`homefy-pk-admin`** | `storecraft-store` / `storecraft-admin` |
| Domains | `homefy.pk` / `admin.homefy.pk` (or `*.vercel.app` staging) | `crazzycars.pk` / `admin.crazzycars.pk` |

## Never

- Deploy Homefy to Coolify apps that serve crazzycars.pk
- Push Homefy commits to `vps-test`
- Point Homefy `MONGODB_URI` at CrazzyCars Atlas
- Reuse CrazzyCars Vercel projects (`storecraft-*`) for Homefy

---

## Vercel (created)

| Project | Staging URL |
|--|--|
| `homefy-pk-store` | https://homefy-pk-store.vercel.app |
| `homefy-pk-admin` | https://homefy-pk-admin.vercel.app |

Local app folders are linked to these projects (`.vercel/`). Old CrazzyCars links are backed up as `.vercel.crazzycars-backup/` (gitignored).

### Deploy from CLI (current)

Root Directory is **empty** so CLI deploys from inside each app folder work:

```bash
cd storecraft-store && vercel --prod --yes --scope hasnain-s-projects3
cd ../storecraft-admin && vercel --prod --yes --scope hasnain-s-projects3
```

### Connect Git (one-time in Vercel UI)

CLI git connect needs a GitHub Login Connection on the Vercel account:

1. Vercel → Account → Login Connections → link GitHub
2. Each Homefy project → Settings → Git → connect `hasnain007007/Crazzycars.pk`
3. Production Branch = **`homefy-dev`**
4. Then set Root Directory to `storecraft-store` / `storecraft-admin` (required for monorepo Git builds)

### Custom domains

When DNS is ready:

- Store: `homefy.pk` + `www.homefy.pk` → `homefy-pk-store`
- Admin: `admin.homefy.pk` → `homefy-pk-admin`

Then update both projects’ env:

- `SITE_URL` / `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_STORE_URL` → `https://homefy.pk`
- `NEXT_PUBLIC_ADMIN_URL` / admin `NEXT_PUBLIC_APP_URL` → `https://admin.homefy.pk`
- Store `NEXT_PUBLIC_INDEXABLE=true` only on the real domain

### Atlas Network Access (required for live)

Atlas currently allows only your laptop IP. **Before Homefy works on Vercel/Coolify**, open Atlas → Network Access → Add IP → **`0.0.0.0/0`** (or at least Vercel + VPS `31.97.107.181`).

Without this, builds/runtime get `MongooseServerSelectionError` / IP not whitelisted.

---

## Coolify (create new apps — UI currently firewalled from local)

Existing **CrazzyCars** Coolify apps (leave alone):

| App | UUID | Branch | Domains |
|--|--|--|--|
| storecraft-store | `p3pc49joci5kaevutpfxxg1x` | `vps-test` | crazzycars.pk |
| storecraft-admin | `5h6iqdyndmnzf9ggy47okrwc` | `vps-test` | admin.crazzycars.pk |

Coolify UI: `http://31.97.107.181:8000` (may only be reachable from the VPS / VPN).

### Create Homefy apps

1. **New Application** → GitHub `hasnain007007/Crazzycars.pk`
2. Branch: **`homefy-dev`** (watch this branch only)
3. Base Directory: `/storecraft-store` (then repeat for `/storecraft-admin`)
4. Build Pack: **Dockerfile** (repo already has `Dockerfile` + healthcheck)
5. Name: `homefy-pk-store` / `homefy-pk-admin`
6. Domains: `homefy.pk` / `admin.homefy.pk` (or temporary Coolify FQDNs)
7. Env: paste from checklist below — **Homefy Atlas URI only**
8. Build args / env for `NEXT_PUBLIC_*` and `MONGODB_URI` (needed at build)

Do **not** change branch or env on the CrazzyCars UUIDs above.

### Required env (both apps)

```text
MONGODB_URI=mongodb+srv://homefypk1_db_user:***@cluster0.g8tmzmx.mongodb.net/homefy_pk?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=<unique Homefy secret — not CrazzyCars>
```

### Store only

```text
CATALOG_BACKEND=mongo
NEXT_PUBLIC_APP_NAME=Homefy.pk
NEXT_PUBLIC_STORE_NAME=Homefy.pk
SITE_URL=https://homefy.pk
NEXT_PUBLIC_SITE_URL=https://homefy.pk
NEXT_PUBLIC_STORE_URL=https://homefy.pk
NEXT_PUBLIC_ADMIN_URL=https://admin.homefy.pk
NEXT_PUBLIC_APP_URL=https://homefy.pk
REVALIDATE_SECRET=<shared with admin>
CRON_SECRET=<homefy-only>
CLOUDINARY_* / NEXT_PUBLIC_CLOUDINARY_*
```

### Admin only

```text
NEXT_PUBLIC_APP_NAME=Homefy.pk
NEXT_PUBLIC_APP_URL=https://admin.homefy.pk
NEXT_PUBLIC_STORE_URL=https://homefy.pk
STOREFRONT_ORIGIN=https://homefy.pk
REVALIDATE_SECRET=<same as store>
CLOUDINARY_*
```

Runtime refuse gate: Homefy `lib/db.js` throws if URI matches `yg8dcwr|sialkot_motorsports|crazzycars`.

---

## Cloudinary independence

Local Homefy still uses cloud `dquier8fv` (CrazzyCars-era). For full independence, create a **new** Cloudinary cloud for Homefy and replace all `CLOUDINARY_*` / `NEXT_PUBLIC_CLOUDINARY_*` on Homefy Coolify + Vercel only.

---

## Verify independence

```bash
node scripts/homefy/verify-deploy-independence.mjs
```

Checks: Homefy Mongo host, Vercel project names, no CrazzyCars URI in Homefy env packs.
