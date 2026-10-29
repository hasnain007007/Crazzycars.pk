# Production database access (CrazzyCars)

**Last verified:** 2026-10-29

## Same data, new VPS

On **2026-10-27** production moved from Hostinger `31.97.107.181` to **`179.197.250.101`**.  
This is the **same** CrazzyCars catalog, orders, customers, and media — only the server changed. Not a fresh database.

| | |
|--|--|
| Live store | https://crazzycars.pk |
| Live admin | https://admin.crazzycars.pk |
| Order Hub | https://orderhub.crazzycars.pk |
| Coolify panel | https://panel.crazzycars.pk |
| VPS | `179.197.250.101` |

Live counts (2026-10-29): **430** products · **605** orders · **344** customers · **38** blogs.

## What production actually uses

Live `crazzycars.pk` / `admin.crazzycars.pk` (Coolify on the VPS) connect to Docker Mongo on host `sialkot-mongo` with database **`crazzycars_motorsports`**.

- Host `sialkot-mongo` is a **Docker-internal** hostname on the VPS.
- **Live write fingerprint** (sha256-16 of the full URI string): `187aad8c44fe3a84`
- **Legacy twin (do not write):** DB `sialkot_motorsports` fingerprint `84143ac0cb2c3085`
- **Atlas (never write):** fingerprint `317ae4de8eb24f84`
- Never print connection strings. It is **not** reachable from laptops or the public internet, by design.

Do **not** publish or UFW-expose Mongo port 27017 to “fix” local scripts.

Canonical guard: `scripts/mongo/prodFingerprint.mjs` (`assertLiveWriteFingerprint` / `assertLiveWriteDbName`). Scripts must refuse any fingerprint other than `187aad8c44fe3a84` for writes.

## What `.env.local` is (and is not)

Workstation `storecraft-store/.env.local` and `storecraft-admin/.env.local` may still contain a **legacy Atlas** `MONGODB_URI` (pre–VPS-migration leftover). Different server; data has diverged.

Those files are labeled with an explicit WARNING above `MONGODB_URI`. Treat any script that loads `.env.local` on a laptop as **non-production**.

| Source | Host / DB | Fingerprint (sha256-16) | Write? |
|--------|-----------|-------------------------|--------|
| Coolify live (`crazzycars-store` / `crazzycars-admin`) | `sialkot-mongo` / `crazzycars_motorsports` | `187aad8c44fe3a84` | **YES — only** |
| Legacy twin containers (`sialkot-store` / `sialkot-admin`) | `sialkot-mongo` / `sialkot_motorsports` | `84143ac0cb2c3085` | **NO** |
| Local `.env.local` (legacy Atlas) | Atlas cluster | `317ae4de8eb24f84` | **NEVER** |

## How to read/write real production Mongo

1. SSH to the VPS as root with the working key only: `id_ed25519` (avoid multi-key probes — fail2ban will ban the IP). Host: `179.197.250.101`.
2. Run queries **on the VPS**, against Docker Mongo, e.g.:

```bash
docker exec sialkot-mongo mongosh crazzycars_motorsports --quiet --eval 'db.products.countDocuments({})'
```

Or `docker exec` into `crazzycars-store` / `crazzycars-admin` (live URI already in their env). Confirm fingerprint `187aad8c44fe3a84` before any write.

3. Never use a laptop `.env.local` script to claim “production state” or to apply a production write.
4. After any production data change, still verify with live Googlebot/Bingbot curls against `https://crazzycars.pk/...`.

## Related

- Coolify store/admin apps: `NEXT_PUBLIC_SITE_URL` / admin URL on `crazzycars.pk`
- Host path notes on the VPS: `/data/crazzycars/README-MIGRATE.md`
- Held SKUs (`securityHold`) live only on VPS Mongo until reactivated there
- Nightly dump / weekly restore-test / health alert: `/data/crazzycars/scripts/*` → `crazzycars_motorsports`
