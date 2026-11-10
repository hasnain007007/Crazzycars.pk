# DATABASE_TARGET_VERIFICATION

**Revalidated:** 2026-11-11 (UTC ~23:07) — read-only HTTP only. **Zero Mongo writes.**

## Production serving CrazzyCars.pk (application-level)

| Check | Result |
| --- | --- |
| Public site | https://crazzycars.pk |
| Store identity | `service: storecraft-store`, `ok: true`, `db: ok` |
| Catalog snapshot | products **430**, blogs **38** |
| Admin identity | `service: storecraft-admin`, `db: ok` |
| Expected DB name (ops gate) | `crazzycars_motorsports` |
| Canonical live URI fingerprint (code gate) | `187aad8c44fe3a84` (`LIVE_URI_FINGERPRINT` in `previewMongoGuard.mjs`) |
| Fingerprint re-proven via live Mongo shell this session | **No** — treat as mandatory precondition at apply time |

## Expected P0 product records (public API, 2026-11-11)

| SKU | `_id` | Live evidence matches migration doc |
| --- | --- | --- |
| CC-0023 Alto fender | `6a5d226489c0c8d16c691fb8` | VC includes Alto **and** Swift 2025–2026 |
| CC-0157 Steering trim | `6a5d227089c0c8d16c692045` | Categories include `splitters-side-skirts` |
| CC-0162 Ducktail | `6a5d227089c0c8d16c69204a` | Sole category `splitters-side-skirts` |
| CC-0156 Corolla monogram | `6a5d227089c0c8d16c692044` | VC Aqua + Corolla×2 + Vitz + Yaris |

Category IDs confirmed via API: Splitters `6a5ccf34…1af0`, Spoilers `6a5ccf34…1af1`, Carbon `6a5ccf35…1afc`.

## Local agent connection (NOT production)

| Check | Result |
| --- | --- |
| Local URI fingerprint | `317ae4de8eb24f84` (Atlas) — **refused for writes** |
| Must never write | Any FP ≠ `187aad8c44fe3a84`, legacy twin `84143ac0cb2c3085`, other merchant DBs |

## Rule

Application health proves the **live app** talks to a healthy Mongo.  
Fingerprint `187aad8c44fe3a84` + DB name `crazzycars_motorsports` remain mandatory before any write script.  
**Never touch unrelated databases on the same cluster/VPS.**
