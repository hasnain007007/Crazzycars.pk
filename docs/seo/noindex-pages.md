# noindex pages inventory (SEO Task 5, 4 Nov 2026)

Pages that intentionally render `noindex` (or `X-Robots-Tag: noindex`). Owner should confirm GSC’s ~25 noindex URLs match this list.

## Always noindex

| Pattern | Reason |
|---------|--------|
| `/account/*`, `/checkout/*`, `/cart/*`, `/wishlist`, `/compare` | Private commerce |
| `/api/*` | API |
| `/search`, `/track-order`, `/order-confirmation` | Utility / thin |
| Preview/staging hosts | `lib/siteUrl` host guard |
| HTTP 410 Gone body (`legacy-gone`) | Junk kitchen/beauty |

## Conditional noindex

| Pattern | Reason |
|---------|--------|
| `/shop?page=N` (N≥2), `/categories/*?page=N`, `/cars/*?page=N`, `/blogs?page=N` | Pagination — self-canonical, crawlable links kept |
| Listing `?sort=`, `?view=`, `?q=`, other facets | Facet duplicate — canonical to clean URL |
| Active products with **no real photo** (`productHasRealImage` false) | Thin PDP / placeholder-only (~38 key covers until photos uploaded) |
| Empty category/car shelves (when rendered with intro) | Soft-404 prevention — `noindex,follow` until products assigned |
| `product.seo.robots` admin override containing noindex | Explicit CMS flag |

## Must stay indexable

- Active products with ≥1 real image (`isIndexableProduct`)
- Category / car hubs with ≥1 active product (page 1, no facets)
- Static trust pages: `/`, `/about`, `/contact`, `/faq`, `/cash-on-delivery`, `/returns-policy`, etc.

## Owner action

After deploy, compare GSC “Excluded by ‘noindex’ tag” sample URLs to this doc. Photo-less key covers stay noindex until real images replace `*-placeholder*.webp`.
