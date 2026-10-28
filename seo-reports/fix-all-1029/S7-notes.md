# S7 Images / CWV

## Done
- Scanned `/data/crazzycars/media`: **85** files >300 KB (all already `.webp`).
- Created compressed siblings `{stem}-sm.webp` (q72, max width 1600) — **originals kept**.
- Report: `S7-compress-report.tsv` (85 rows).
- Storefront already: `-400.webp` thumbs for ≤800px slots; `loading=lazy` below fold; `fetchPriority=high` + preload on PDP/category/home LCP paths.

## Partial / blocked
- Gallery still references master URLs when no width hint (cannot auto-swap to `-sm.webp` without existence check — would 404 on untouched assets).
- Lighthouse: `before` baseline not captured in this loop (no prior LH artifacts). After scores written to `S7-lh-*.json` when runs finish.
- Targets LCP&lt;2.5s / CLS&lt;0.1: verify from LH JSON.

## Next (optional follow-up)
- Point PDP gallery `src` at `-sm.webp` when sibling exists (server-side `fs.existsSync` in image resolver), or regenerate masters under 300 KB in place with backup.
