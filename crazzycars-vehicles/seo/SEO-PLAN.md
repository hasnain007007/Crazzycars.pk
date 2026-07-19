# CrazzyCars.pk — SEO Plan for Google Ranking

Honest note first: nobody can guarantee #1 on Google — anyone promising that is lying.
What this plan does is implement everything Google actually rewards, which is how
AutoJin and other PK stores rank. Done properly, category/vehicle pages start
ranking for long-tail searches ("civic x body kit price in pakistan") within weeks,
and head terms build over months.

## 1. Technical foundation (do first — biggest impact)

- **Your site is Next.js on Vercel — use server-side rendering for ALL product,
  category and vehicle pages.** If products render only client-side, Google sees an
  empty page. Every page must return full HTML with title/meta already in it
  (use `generateMetadata()` in the App Router).
- **One domain only.** Right now the Vercel site's canonical points to
  `sialkotmotorsports.com` while the brand is crazzycars.pk — Google treats these
  as different sites and you split your ranking power. Decide the final domain,
  set it in Vercel, and make every canonical tag point to it. When you switch from
  Shopify, 301-redirect every old Shopify URL to the matching new URL
  (`/collections/honda-civic-x-...` → `/cars/honda-civic-x-2016-2021`), otherwise
  you lose all existing rankings.
- **robots.txt + sitemap.xml** — see `next-sitemap-example.js`. Submit the sitemap
  in Google Search Console on day one.
- **Core Web Vitals**: use `next/image` for all product images (auto WebP + lazy
  loading), keep LCP under 2.5s. Your Shopify CDN images work, but re-hosting on
  your own CDN (Cloudinary — you already use it) is safer long-term.

## 2. Metadata pattern (already built into the seed data)

Every category and vehicle in the seed files ships with unique `metaTitle` and
`metaDescription` following the pattern that wins PK car-accessory searches:

- Title: `{Car/Category} Accessories in Pakistan | {benefit} | CrazzyCars.pk` (≤60 chars where possible)
- Description: what you sell + "Cash on Delivery nationwide" (people search COD) (≤155 chars)

Rules: never two pages with the same title; H1 = page name (one H1 per page);
product titles keep the car + years in them ("Toyota Corolla 2015–2026 Side
Window Louvers – Black") because that's literally what people type.

## 3. Structured data (rich results) — `seo/jsonld.js`

- `Product` schema on every product page → price, stock and stars appear in Google
- `BreadcrumbList` on category/product pages → clean breadcrumb in results
- `AutoPartsStore` (Organization) in the root layout → knowledge panel signals
- `WebSite + SearchAction` → sitelinks search box

Test every template with Google's Rich Results Test before launch.

## 4. Page structure that ranks (the AutoJin lesson)

Vehicle pages are your SEO goldmine — "honda civic accessories" gets far more
searches than any single product. Each vehicle page should have:
1. H1: "Honda Civic X 2016–2021 Accessories & Body Kits"
2. 100–150 words of real intro text (unique per page — never copy-paste)
3. The product grid
4. FAQ block (3–4 questions: "Do these fit the 2018 Civic?" etc.) with FAQ schema

Same for parent categories ("Body Kits in Pakistan") and child categories.

## 5. Content & off-page (ongoing)

- Keep the blog: 2–4 posts/month targeting question searches
  ("best body kit for civic 2018 in pakistan", "how to install side skirts").
  Interlink posts → category/vehicle pages.
- Google Business Profile for the Gujranwala address; collect reviews.
- Keep your Facebook/Instagram/TikTok links on every page (already in Organization schema).
- Get listed on PakWheels forums / local directories for backlinks.

## 6. Migration-day checklist

1. Seed categories + vehicles (done — these files)
2. Import products with metaTitle/metaDescription per product (I'll generate from your CSV)
3. Verify SSR: view-source on a product page must show the full title/meta/JSON-LD
4. Set canonical domain + 301 redirects from all Shopify URLs
5. Submit sitemap in Search Console; request indexing for top 20 pages
6. Run Rich Results Test + PageSpeed Insights; fix anything red
