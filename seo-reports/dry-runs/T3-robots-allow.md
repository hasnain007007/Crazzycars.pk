# T3 dry-run — robots Allow 404s (C14)

## Root cause
1. Live `Allow: /ai/` → 308 → `/ai` → **404** (only concrete broken Allow).
2. Verifier false positives: `/Allow:/gi` matches the suffix of **`Disallow:`**, so `/api/` and `/admin/` are reported as Allow→404 though they are Disallow-only.

## Exact diff

### `storecraft-store/app/robots.js`
Replace allow entries `/ai/` with `/ai/catalog` (200 OK) in `*` and AI crawler rules:

```diff
- allow: ["/", "/llms.txt", "/ai.txt", "/feed/", "/ai/", "/.well-known/"],
+ allow: ["/", "/llms.txt", "/ai.txt", "/feed/", "/ai/catalog", "/.well-known/"],
```
(twice: base `*` rule and `AI_CRAWLERS.map`)

### `scripts/seo-verify.mjs` (C14 Allow parser)
```diff
- ...new Set([...text.matchAll(/Allow:\s*(\S+)/gi)].map((m) => m[1])),
+ ...new Set([...text.matchAll(/(?:^|\n)Allow:\s*(\S+)/gi)].map((m) => m[1])),
```

## After change, expected Allow set
`/`, `/llms.txt`, `/ai.txt`, `/feed/`, `/ai/catalog`, `/.well-known/`

## CSV / list of paths removed from Allow
| path | reason |
|------|--------|
| `/ai/` | trailing slash redirects to `/ai` 404 |

## Paths kept (verified 200 or exempt)
| path | status |
|------|--------|
| `/llms.txt` | 200 |
| `/ai.txt` | 200 |
| `/feed/` | exempt in C14 |
| `/ai/catalog` | 200 (new Allow) |
| `/.well-known/` | ok via ai.json / security.txt candidates |

## Rollback
Revert both files; redeploy `vps-test`.
