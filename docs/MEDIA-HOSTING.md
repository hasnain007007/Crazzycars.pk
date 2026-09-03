# Coolify persistent media volume (shared by store + admin)

## Goal
Host product images on the VPS forever — no Cloudinary credits.

## Coolify setup (one-time)

1. Create a **persistent volume** (or host path), e.g. `/data/crazzycars/media`.
2. Mount it on **both** applications at the same container path:

| App | Container path | Env |
|-----|----------------|-----|
| storecraft-store | `/app/media` | `MEDIA_ROOT=/app/media` |
| storecraft-admin | `/app/media` | `MEDIA_ROOT=/app/media` |

3. Set on **admin** (and store if not already):

```
MEDIA_ROOT=/app/media
NEXT_PUBLIC_STORE_URL=https://crazzycars.pk
```

Optional: `MEDIA_PUBLIC_BASE_URL=https://crazzycars.pk` (origin only; `/media` is appended).

4. Volume ownership: container user is `nextjs` (uid **1001**). If uploads fail with EACCES, on the host:

```
chown -R 1001:1001 /data/crazzycars/media
```

5. Redeploy store + admin after env/volume changes.

## Public URLs

Files are served by the storefront at:

`https://crazzycars.pk/media/{folder}/{filename}`

Admin uploads write into `MEDIA_ROOT` and return that absolute URL so Mongo no longer depends on Cloudinary.

## Rehost existing Cloudinary / Shopify URLs

Run from a machine that can write the **same** files Coolify serves (SSH into the VPS and use the host path, or `docker exec` into the store container with `MEDIA_ROOT=/app/media`):

```bash
# Dry run — downloads whatever is still reachable (e.g. older djmqim946 / Shopify CDN)
node --env-file=storecraft-store/.env.local scripts/rehost-media-to-vps.mjs

# Apply Mongo rewrites only after files exist on the production volume
MEDIA_ROOT=/data/crazzycars/media \
NEXT_PUBLIC_STORE_URL=https://crazzycars.pk \
node --env-file=storecraft-store/.env.local scripts/rehost-media-to-vps.mjs --apply

# If Cloudinary is dead, supply a zip of product photos (matched by filename stem)
node --env-file=storecraft-store/.env.local scripts/rehost-media-to-vps.mjs --apply --from-zip=./product-photos.zip
```

Do **not** `--apply` from a laptop unless you also sync `MEDIA_ROOT` onto the VPS — otherwise Mongo will point at `/media/...` paths that 404.

## Local development

Defaults to `{app}/media` under each package cwd. Run store on `:3000` so `/media` resolves; set `NEXT_PUBLIC_STORE_URL=http://localhost:3000` in admin.
