# Homefy MongoDB (separate from CrazzyCars)

Homefy uses its **own** MongoDB database: **`homefy_pk`**.  
Never point Homefy at CrazzyCars Atlas (`sialkot_motorsports` / `yg8dcwr`).

## Local (already set up)

```bash
# Credentials file (gitignored)
# .env.homefy.mongo

docker compose -f docker-compose.homefy-mongo.yml --env-file .env.homefy.mongo up -d
```

| | |
|--|--|
| Host | `127.0.0.1` |
| Port | **27027** (not 27017 — avoids clashing with other Mongo) |
| Database | `homefy_pk` |
| User | `homefy` |
| Auth | `authSource=admin` |

URI shape:

```text
mongodb://homefy:PASSWORD@127.0.0.1:27027/homefy_pk?authSource=admin
```

Storefront must use **`CATALOG_BACKEND=mongo`** so products created in Admin appear on the shop.

Seed admin (once):

```bash
cd storecraft-admin && node scripts/seed-admin.mjs --force
```

Login: `admin@homefy.pk` (password from seed script / your reset).

## Coolify / VPS (for workers)

1. Create a **new** Mongo service from `docker-compose.homefy-mongo.yml` (or Coolify “MongoDB” resource).
2. Set `HOMEFY_MONGO_PASSWORD` in Coolify env.
3. Create **new** Homefy store + admin apps on branch **`homefy-dev`** (do not use CrazzyCars apps).
4. Set both apps:
   - `MONGODB_URI` → Homefy Mongo URI above
   - Store: `CATALOG_BACKEND=mongo`
   - Cross-link `NEXT_PUBLIC_STORE_URL` / `NEXT_PUBLIC_ADMIN_URL`
   - `CLOUDINARY_*` for image uploads
5. Run `seed-admin.mjs` once against that URI (one-off job or local with prod URI).

## Atlas (optional cloud)

Create a **new** free cluster → database name **`homefy_pk`** → user with readWrite → paste URI into Coolify/Vercel Homefy apps only.
