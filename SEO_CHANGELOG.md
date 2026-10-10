# SEO changelog — Search Console audit (10 Oct 2026)

## Follow-up (11 Oct 2026)

- Locked `/categories/led-headlights-bulbs` to pre-audit title/meta (`CATEGORY_SEO_OWNER_LOCKED`); skipped in apply script. Prod Mongo row was already divergent.
- AC panel: “Butto”→“Button” in meta/alt/description; Key features = two bullets only (fitment years still in TODO).
- Oshan X7: Description accordion uses exact Phase 4 paragraph.

## After deploy (owner)

- Resubmit `https://crazzycars.pk/sitemap.xml` in Search Console.
- Request indexing for changed pages in batches of 10 per day.
- Re-check CTR and position for the same pages after 4 weeks, with the same date range length.

## Real Mongo write (owner / staging)

Dry-run only was executed in this change set. To write:

```bash
cd /Users/mac/Desktop/CCSMS && node --env-file=storecraft-store/.env.local scripts/seo/apply-seo-2026-10.mjs --apply --allow-write
```

Add `--i-know-this-is-staging` only after confirming the URI fingerprint (see `docs/OPS-PRODUCTION-DATABASE.md`). Backup file: `seo-backup-2026-10.json`.

## Files changed

- `seo-data/Pages.csv` — Search Console pages export (read-only input).
- `seo-data/Queries.csv` — Search Console queries export (read-only input).
- `storecraft-store/lib/collectionRedirectMap.mjs` — `/collections/` → canonical map + review list.
- `storecraft-store/lib/productFallbackRedirects.mjs` — `/products/` fallbacks for missing flat twins.
- `storecraft-store/lib/stripQueryKeys.mjs` — shared strip list (`page` not stripped).
- `storecraft-store/lib/legacyHandleMaps.mjs` — aliases + wire collection map into legacy redirects.
- `storecraft-store/lib/resolveCollectionHandle.js` — prefer collection map before DB fuzzy match.
- `storecraft-store/middleware.js` — product fallbacks, collection fast path, keep `?page=`.
- `storecraft-store/app/[slug]/page.jsx` — flat fallbacks, absolute title/meta overrides, product FAQ extras.
- `storecraft-store/lib/seo/gscAudit2026-10.mjs` — titles, metas, H1s, intros, FAQs, product copy.
- `storecraft-store/lib/seo/generationAliases.js` — `CATEGORY_KEYWORD_META` for Phase 2 categories.
- `storecraft-store/app/page.jsx` — home title/meta override.
- `storecraft-store/app/contact/page.jsx` — contact title/meta override.
- `storecraft-store/app/cars/[slug]/page.jsx` — vehicle SEO overrides, HTML intro/H2 blocks, FAQ extras.
- `storecraft-store/app/categories/[slug]/page.jsx` — absolute titles, audit description HTML, FAQ merge.
- `storecraft-store/components/store/CategoryHeroBanner.jsx` — category H1 overrides.
- `storecraft-store/components/store/ProductDetailMedico.jsx` — H1/intro/features/care/append copy.
- `scripts/seo/apply-seo-2026-10.mjs` — idempotent Mongo apply (dry-run default).
- `scripts/seo-verify/verify-seo-2026-10.mjs` — redirect/sitemap/title/H1 checks.
- `tests/seo-redirects-2026-10.test.ts` — redirect map + pagination canonical tests.
- `tests/seo-titles-2026-10.test.ts` — title ≤62 / meta ≤160.
- `tests/seo-indexing.test.ts` — align robots `q=` expectation with SearchAction.
- `SEO_REDIRECT_REVIEW.md` — inferred redirects for owner approval.
- `SEO_TODO_FOR_OWNER.md` — bracketed questions + fitment conflicts.
- `SEO_CHANGELOG.md` — this file.
