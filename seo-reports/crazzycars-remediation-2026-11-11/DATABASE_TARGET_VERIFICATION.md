# DATABASE_TARGET_VERIFICATION — Stage 2 (post `c98e0ad`)

**Verified:** 2026-11-11 (read-only via `docker exec crazzycars-store`)  
**Writes this session:** **none**

## Live application identity

| Check | Result |
| --- | --- |
| Store health | `storecraft-store`, `db: ok`, products **430** |
| Admin health | `storecraft-admin`, `db: ok` |
| Deployed store image | `crazzycars-store:c98e0ad` |
| Mongo host (from store env, hostname only) | `sialkot-mongo` |
| Database name | **`crazzycars_motorsports`** |
| Product count in that DB | **430** (matches public health) |

## Fingerprint clarification

| Fingerprint | Meaning |
| --- | --- |
| `187aad8c44fe3a84` | Historical **canonical short URI** form `mongodb://sialkot-mongo:27017/crazzycars_motorsports` (no credentials) — still the documented path identity in `scripts/mongo/prodFingerprint.mjs` |
| **`aef1004e2d04d2fc`** | **Current live store `MONGODB_URI` sha256-16** (credentialed). Measured from running `crazzycars-store` env |
| `84143ac0cb2c3085` | Legacy twin DB path `sialkot_motorsports` — **refuse** |
| `317ae4de8eb24f84` | Atlas / local `.env.local` — **refuse** |

**Identity verdict:** Live CrazzyCars is **`sialkot-mongo` / `crazzycars_motorsports`**. Document IDs and catalogue size match the public site. Apply scripts must gate on:

1. `dbName === crazzycars_motorsports`  
2. Host `sialkot-mongo`  
3. Current store-env URI FP **`aef1004e2d04d2fc`** (or recompute at apply time and require match to store container env)  
4. Exact product `_id` + slug preconditions  

Do **not** treat a bare mismatch vs the old unauthenticated `187aad8c…` alone as “wrong database” if (1)–(4) hold.

## Isolation from other sites / DBs

| Target | Action |
| --- | --- |
| `crazzycars_motorsports` | Only DB visible to the store Mongo user in this probe |
| `sialkot_motorsports` / Gujranwala / OPA / Atlas | **Out of scope — do not connect or write** |
| Other VPS apps | Untouched |

## Expected P0 documents (present)

| SKU | `_id` | Present |
| --- | --- | --- |
| CC-0023 | `6a5d226489c0c8d16c691fb8` | Yes |
| CC-0157 | `6a5d227089c0c8d16c692045` | Yes |
| CC-0162 | `6a5d227089c0c8d16c69204a` | Yes |
| CC-0156 | `6a5d227089c0c8d16c692044` | Yes |

Category IDs confirmed active: Splitters `…1af0`, Spoilers `…1af1` (status `active`), Carbon `…1afc`.
