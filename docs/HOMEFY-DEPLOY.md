# Homefy.pk — Independent Coolify + Vercel

Homefy is **not** CrazzyCars. Separate **private GitHub repo**, Mongo, host projects, domains, and ship branch.

| | Homefy | CrazzyCars (do not touch) |
|--|--|--|
| **GitHub** | **`https://github.com/hasnain007007/homefy.pk`** (private) | `Crazzycars.pk` |
| Git remote | **`homefy`** → `main` | `origin` → `vps-test` |
| Local branch | `homefy-dev` (tracks `homefy/main`) | `vps-test` |
| Mongo | `cluster0.g8tmzmx…` / DB **`homefy_pk`** | `yg8dcwr` / `sialkot_motorsports` |
| Coolify apps | **New** `homefy-pk-store` + `homefy-pk-admin` | existing store/admin on `vps-test` |
| Vercel projects | **`homefy-pk-store`** + **`homefy-pk-admin`** | `storecraft-store` / `storecraft-admin` |
| Domains | `homefy.pk` / `admin.homefy.pk` (or `*.vercel.app` staging) | `crazzycars.pk` / `admin.crazzycars.pk` |

## Never

- Deploy Homefy to Coolify apps that serve crazzycars.pk
- Push Homefy commits to CrazzyCars `vps-test` as the Homefy source of truth
- Point Homefy `MONGODB_URI` at CrazzyCars Atlas
- Reuse CrazzyCars Vercel projects (`storecraft-*`) for Homefy
- Make `homefy.pk` public

### Ship Homefy code

```bash
git push homefy homefy-dev:main
```

---

## Vercel (created)

| Project | Staging URL |
|--|--|
| `homefy-pk-store` | https://homefy-pk-store.vercel.app |
| `homefy-pk-admin` | https://homefy-pk-admin.vercel.app |

Local app folders are linked to these projects (`.vercel/`). Old CrazzyCars links are backed up as `.vercel.crazzycars-backup/` (gitignored).

### Deploy from CLI (works now)

```bash
cd storecraft-store && vercel --prod --yes --scope hasnain-s-projects3
cd ../storecraft-admin && vercel --prod --yes --scope hasnain-s-projects3
```

### Connect Git to private `homefy.pk` (one-time)

Vercel needs a GitHub Login Connection on the account (CLI cannot finish this alone):

1. Open https://vercel.com/account/login-connections → connect **GitHub**
2. Install/authorize the Vercel GitHub App on **`hasnain007007/homefy.pk`** (private)
3. Each Homefy project → Settings → Git → connect **`hasnain007007/homefy.pk`**
4. Production Branch = **`main`**
5. For monorepo Git builds, set Root Directory to `storecraft-store` / `storecraft-admin`

### Custom domains

When DNS is ready:

- Store: `homefy.pk` + `www.homefy.pk` → `homefy-pk-store`
- Admin: `admin.homefy.pk` → `homefy-pk-admin`

Then update env URLs to those domains; set `NEXT_PUBLIC_INDEXABLE=true` only on the real store domain.

### Atlas Network Access (required for live)

Open Atlas → Network Access → Add IP → **`0.0.0.0/0`** (or Vercel + VPS `31.97.107.181`). Without this, Vercel/Coolify cannot reach Mongo.

---

## Coolify (create new apps)

Leave CrazzyCars Coolify UUIDs alone (`p3pc49joci5kaevutpfxxg1x`, `5h6iqdyndmnzf9ggy47okrwc` on `vps-test`).

Create **new** apps from private GitHub **`hasnain007007/homefy.pk`**, branch **`main`**, base dirs `/storecraft-store` and `/storecraft-admin`, Dockerfile build, Homefy Atlas `MONGODB_URI` + store `CATALOG_BACKEND=mongo`.

Coolify UI: `http://31.97.107.181:8000` (may need VPS/VPN).

---

## Cloudinary

Still shared cloud `dquier8fv` until you create a Homefy-only Cloudinary cloud and update Homefy env only.

---

## Verify

```bash
node scripts/homefy/verify-deploy-independence.mjs
```
