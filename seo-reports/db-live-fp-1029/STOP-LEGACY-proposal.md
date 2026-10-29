# STOP-LEGACY — proposal only (wait `GO STOP-LEGACY`)

## What still depends on sialkot-* apps

| Item | Status |
|------|--------|
| Traefik `sialkot.yml` | Hosts `sialkotmotorsports.com`, `www`, `admin.sialkotmotorsports.com` → sialkot-store/admin |
| Containers | `sialkot-store`, `sialkot-admin` Up (healthy), DB FP `84143ac0cb2c3085` |
| Cron backups | Already on `crazzycars_motorsports` — OK |
| Webhooks | Confirm courier dashboards point at crazzycars.pk, not sialkot host |
| Bookmarks | `admin.sialkotmotorsports.com` still serves login — do not use |
| Admin users | Same emails exist on both DBs; legacy names say Sialkot Motorsports |
| `sialkot-mongo` | **Keep running** — hosts live DB too |

## Evidence of legacy writes today

11 blogposts show legacy `updatedAt` later than live (2026-10-29 ~09:43–09:44Z) while live sits on older stamps — stop legacy admin ASAP after GO.

## Commands (do not run until GO)

```bash
docker stop sialkot-store sialkot-admin
# optional: mv /data/coolify/proxy/dynamic/sialkot.yml /data/coolify/proxy/dynamic/sialkot.yml.disabled
# Coolify UI: stop/disable sialkot-store + sialkot-admin apps — do not delete
# NEVER: docker rm -v, dropDatabase sialkot_motorsports, or stop sialkot-mongo
```

Data retained: Mongo volume + `/data/crazzycars-mongo-backups/legacy/sialkot_motorsports-LEGACY-20261029T094228Z.archive.gz`.
