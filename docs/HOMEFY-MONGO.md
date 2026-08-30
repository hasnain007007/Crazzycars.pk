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

## Coolify / Vercel (for workers)

Full independence checklist: **`docs/HOMEFY-DEPLOY.md`**.

- Branch: **`homefy-dev`** only (never `vps-test` / crazzycars Coolify apps).
- Vercel projects (already created): `homefy-pk-store` + `homefy-pk-admin`.
- Coolify: create **new** apps on `homefy-dev` — do not reuse CrazzyCars UUIDs.
- Env: Homefy Atlas `MONGODB_URI` + store `CATALOG_BACKEND=mongo`.
- Seed: `seed-admin.mjs` once against that URI.

## Atlas (Homefy cloud — ready)

Homefy Atlas cluster: **`cluster0.g8tmzmx.mongodb.net`**  
Database: **`homefy_pk`**  
User: **`homefypk1_db_user`**

Local apps already point at this URI via `.env.local` (gitignored).  
Deploy/Coolify: paste the same `MONGODB_URI` + `CATALOG_BACKEND=mongo`.

**Network access:** Atlas currently allows your IP (`39.37.196.71`). For Coolify/Vercel, add the server IP or temporarily `0.0.0.0/0` under Network Access.

**Security:** Password was shared in chat/screenshots — rotate it in Atlas → Database Access after workers are set up if this chat is shared.

