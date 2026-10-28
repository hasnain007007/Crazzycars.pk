# FINAL REPORT — seo/fix-1029b

Branch merged to `vps-test` · live image `crazzycars-store:live` @ **09f3d32**.

## Task table

| Task | Status | Commit(s) | Before → After |
|------|--------|-----------|----------------|
| **S10** Legacy atom / `?page=1` | **Live** | `37ab1fa` | `.atom` was 308→categories 200 → **410**; `/blogs?page=1` was 200 → **308→/blogs**; `/products/…` still redirects to flat slug 200. Verify: `S10-verify.txt` |
| **S11** Related guides / From the blog + C24 | **Live** | `54572da`, `09f3d32` | No blocks → Related guides on blogs; From the blog on cat/car/PDP. C24: soft fail 7 posts → **pass (0 fails)** after catalog expand. `S11-verify.txt` |
| **S7c** TTFB / ISR / cache | **Code live**; indexes blocked | `6f5bff5` | LH TTFB ~0.5–0.8s → **~0.16–0.18s** (LH). Home LCP 2.9→**2.91**; cat 3.2→**3.17** (still &gt;2.5); PDP **1.23**; blog **1.13**. CLS **~0.039**. Indexes: dry-run only. Edge: `S7c-edge-cache.md`. `S7c-verify.txt` / `S7c-notes.md` |
| **S5** Blog rewrites | **Dry-run only** | docs | `S5-dry-run.md` ready. **No DB write.** |
| **S6-DB** Keyword map sync | **Waiting** | — | Reuse `fix-all-1029/S6-dry-run.md`. Apply with L1 after M4 restore. |

Hard verify failures (C4–C7, C9, C10, C12, C15) are pre-existing catalog checks, unchanged by this loop.

## What is live now

- Atom feeds → HTTP 410; listing `?page=1` → 308 to clean URL.
- Blog / category / car / product internal-link blocks.
- ISR 600s + `unstable_cache` on home hot queries / blog HTML; `/media` Cache-Control at origin.
- C24 inbound check in `scripts/seo-verify.mjs` (passing).

## Waiting for your exact GO

| Message | Action |
|---------|--------|
| **`GO S5`** | Apply six blog `$set`s from `S5-dry-run.md` on FP `84143ac0cb2c3085` after mongodump |
| **`GO S7c-INDEXES`** | Create indexes in `S7c-indexes-dry-run.md` (background createIndex only) |
| **`GO S6`** (after M4+L1) | Keyword-map DB sync with L1 |

## Blocked / deferred

| Item | Why |
|------|-----|
| Home/cat LCP &lt; 2.5 s | Server TTFB fixed in LH; remaining LCP is hero/image path. Edge HTML cache (ops) + indexes may help; not fully met. |
| S6-DB | Waiting M4 restore settlement + apply with L1 |
| nginx/CF HTML rules | Documented; not auto-applied on VPS/CF panel |
| Coolify webhook | Idle — deploys done via manual `docker build --network=host` + container recreate |

## Exact GO messages to send next

```
GO S5
GO S7c-INDEXES
GO S6
```

(Use `GO S6` only after M4 restore is settled; apply together with L1.)
