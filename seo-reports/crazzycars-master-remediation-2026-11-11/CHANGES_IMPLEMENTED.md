# Changes Implemented

## Files touched

- `storecraft-store/lib/sitemap/entries.js` — empty hub filter
- `storecraft-store/lib/vehicleSlugRedirects.mjs` — BR-V alias → /cars
- `storecraft-store/app/cars/[slug]/page.jsx` — metadata kept-product count
- `storecraft-store/lib/scrubPolicyConflictCopy.js` — C19 scrub expansion
- `storecraft-store/components/store/ProductDetailMedico.jsx` — scrub + trust/delivery
- `storecraft-store/lib/seo/keywordStrategyFaqs.js` — link-only policy FAQ; shorter vehicle FAQ
- `storecraft-store/lib/seo/buildVehicleIntro.js` — shorter policy pointer
- `storecraft-store/components/store/ProductSpecificsPanel.jsx` — short neighbor note
- `storecraft-store/app/faq/page.jsx` — h3 questions
- `storecraft-store/app/advance-payment/page.jsx` — FAQ heading
- `storecraft-store/app/cart/layout.jsx` — noindex
- `storecraft-store/components/home/GoogleReviewsNote.jsx` — new
- `storecraft-store/components/store/HomePage.jsx` / `AboutPageView.jsx` — mount reviews note
- `storecraft-store/tests/scrubStaleProductBoilerplate.test.mjs` — new
- `.gitignore` — handoff/export ignores

## Prior commits retained (not rewritten)

NAP (`32487c1`), C23 strip (`896639f`), llms (`696666f`) remain in ancestry — still need deploy.
