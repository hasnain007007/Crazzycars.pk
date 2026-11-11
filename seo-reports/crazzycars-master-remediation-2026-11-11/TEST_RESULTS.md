# Test Results

| Check | Result |
|---|---|
| `scrubStaleProductBoilerplate.test.mjs` | PASS |
| `stripEmbeddedFaqHtml.test.mjs` | PASS |
| `normalizeStoreSettings-address.test.mjs` | PASS |
| `npm run build` (storecraft-store) | PASS |
| `npm run lint` | FAIL (pre-existing 93 errors; none introduced as release blockers; build is gate) |
| C19 offline sim (scrub+FAQ strip, 20 PDPs) | PASS (0 fails, sharedBlocks≈1) |
| Live seo-verify C1–C23 after deploy | NOT RUN (no deploy) |
