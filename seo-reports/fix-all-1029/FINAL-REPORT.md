# FINAL REPORT — seo/fix-all-1029

Branch: `seo/fix-all-1029` (merged to `vps-test`). State: `STATE.json`.

## Task table

| Task | Status | Commit | Before → After (checks) |
|------|--------|--------|-------------------------|
| **S2a** Blog redirects (10×308) | **Live** | `18320f9` | `/blogs/news/*` 404 → **308** to live 200; remapped #4→e140 car, #10→`/categories/carbon-fiber`, #17→e170 car. Verify: `S2a-verify.txt` |
| **S2b** Remap 410 rows | **Proposal only** | `18320f9` | Table in `S2b-table.md`. NOT applied. 410 candidates: #11, #18 only |
| **S3** Legacy/empty | **Proposal only** | docs | `S3-list.md` — 13 non-car cats →410; empty car leaves → noindex/nav/sitemap removal |
| **S4** Sitemap + C23 | **Live** | `c0391f8` | C23 already pass → **strengthened** (200 + no noindex + self-canonical). Still pass in `T1-verify.txt` |
| **S7** Images/CWV | **Partial** | media on VPS + docs | 85× `-sm.webp` created (originals kept). LH mobile **after** (no before): home LCP **3.0s** CLS **0.175**; cat 4.3s/0.175; PDP **9.9s**/0.176; blog **1.1s**/0.175. Targets missed except blog LCP |
| **S8** Structured data | **Live** | `c0391f8`→`5dfa970` | PDP Offer gained `hasMerchantReturnPolicy` (C11 cleared from hard_fail). WebSite `sameAs` defaults restored |
| **S9** Canonical audit | **Done** | docs | `S9-canonical-audit.md` — no canonical→redirect/noindex bugs; `/shop?page=N` self-canonical by design |
| **T1** Titles | **Live** | `c0391f8` | Home title 63→**≤60**; Alto DB title wins; shop/cars metas trimmed; door-handle code override Set of 2 / 4490 |
| **M4** Restore | **Blocked dry-run** | — | `M4-dry-run.md` — need authoritative restore plan |
| **L1** M4b re-apply | **Awaiting GO** | — | `L1-dry-run-m4b-reapply.md` — after M4; fresh mongodump; door-handle Set of 2 only |
| **L2** Low-CTR titles | **Awaiting GO** | — | `L2-dry-run-low-ctr-titles.md` — **no product overlap with L1**; separate write |
| **S5** Blog not-indexed | **Blocked** | — | Need slug list |
| **S6** Keyword pages | **Blocked** | — | Missing `claude/gsc-keyword-analysis-2026-10-28` |

## Live now
- S1 (prior) listing noindex; S2a redirects; T1 titles; S4 C23; S8 Offer return policy + WebSite sameAs; S7 `-sm.webp` files on disk

## Waiting for your exact GO
1. **`GO S2b`** — apply remaps in `S2b-table.md` (+ optional 410 for #11/#18)
2. **`GO S3`** — apply 410 / noindex proposals in `S3-list.md`
3. **`GO M4`** — after restore plan settled + fresh dump
4. **`GO L1`** — after M4; dump path required; Set of 2 / Rs 4,490 only for door handles
5. **`GO L2`** — separate from L1
6. **`GO S5`** + slug list
7. **`GO S6`** + keyword analysis file

## Blocked
- **S5**: no crawled-not-indexed slugs supplied
- **S6**: keyword analysis file missing
- **M4**: restore source not confirmed
- **S7**: LCP/CLS above target on home/cat/PDP; gallery still serves large masters; no LH before baseline

## Indexing
See `INDEXING-LIST.md` for URLs to submit now; append after each GO write.
