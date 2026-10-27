# Production database access (CrazzyCars)

**Last verified:** 2026-10-27

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

Post-cutover counts (approx.): **411** products · **596** orders · **335** customers.

## What production actually uses

Live `crazzycars.pk` / `admin.crazzycars.pk` (Coolify on the VPS) connect to:

```text
mongodb://sialkot-mongo:27017/sialkot_motorsports
```

- Host `sialkot-mongo` is a **Docker-internal** hostname on the VPS.
- Fingerprint (sha256-16 of the full URI string): `84143ac0cb2c3085`
- It is **not** reachable from laptops or the public internet, by design.

Do **not** publish or UFW-expose Mongo port 27017 to “fix” local scripts.

## What `.env.local` is (and is not)

Workstation `storecraft-store/.env.local` and `storecraft-admin/.env.local` still contain a **legacy Atlas** `MONGODB_URI` (pre–VPS-migration leftover). Same database *name* (`sialkot_motorsports`), **different server**. Data has diverged (e.g. `securityHold`, product slugs).

Those files are labeled with an explicit WARNING above `MONGODB_URI`. Treat any script that loads `.env.local` on a laptop as **non-production**.

| Source | Host | Fingerprint (sha256-16) |
|--------|------|-------------------------|
| Coolify runtime (prod) on `179.197.250.101` | `sialkot-mongo:27017` | `84143ac0cb2c3085` |
| Local `.env.local` (legacy Atlas) | `cluster0.yg8dcwr.mongodb.net` | `317ae4de8eb24f84` |

## How to read/write real production Mongo

1. SSH to the VPS as root with the working key only: `id_ed25519` (avoid multi-key probes — fail2ban will ban the IP). Host: `179.197.250.101`.
2. Run queries **on the VPS**, against Docker Mongo, e.g.:

```bash
docker exec sialkot-mongo mongosh sialkot_motorsports --quiet --eval 'db.products.countDocuments({})'
```

Or `docker exec` into the store/admin container (same URI is already in their env).

3. Never use a laptop `.env.local` script to claim “production state” or to apply a production write.
4. After any production data change, still verify with live Googlebot/Bingbot curls against `https://crazzycars.pk/...` — that backstop is what caught the Atlas vs VPS mismatch.

## Related

- Coolify store/admin apps: `NEXT_PUBLIC_SITE_URL` / admin URL on `crazzycars.pk`
- Host path notes on the VPS: `/data/crazzycars/README-MIGRATE.md`
- Held SKUs (`securityHold`) live only on VPS Mongo until reactivated there
