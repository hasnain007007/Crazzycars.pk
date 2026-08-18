# CrazzyCars.pk storefront audit

**Scope:** repository as of this audit. Primary app: `storecraft-store` (customer site). Related: `storecraft-admin`, seed packs (`crazzycars-products`, `crazzycars-categories`, `crazzycars-vehicles`), `postex-shopify-middleware`.

**Method:** code only. Where live Mongo, CMS settings, or env cannot be seen, the answer is **UNKNOWN — needs manual check**.

**Language:** the storefront is JavaScript/JSX. There is no TypeScript `Product` type in this repo.

---

## 1. Architecture

### Framework and router

| Item | Value |
|------|--------|
| Framework | Next.js **16.2.4** (`storecraft-store/package.json`) |
| React | **19.2.4** |
| Router | **App Router** (`storecraft-store/app/`). No `pages/` directory for the Pages Router. `app/pages/` is a *route* for Shopify-era `/pages/:slug` aliases. |
| Output | `output: "standalone"` in `next.config.mjs` (Docker/Coolify). |

### Rendering strategy per route

Segment config is set on the page or inherited from `app/layout.js` (`export const revalidate = 60`). `permanentRedirect()` in the App Router emits **HTTP 308**, not 301.

| Route pattern | File | Strategy | Notes |
|---------------|------|----------|--------|
| `/` | `app/page.jsx` | **ISR** (`revalidate = 60`) | Server loads Mongo (or Shopify if `STORE_CATALOG=shopify`). Body is `"use client"` `HomePage` with `next/dynamic` product sections. |
| `/[slug]` | `app/[slug]/page.jsx` | **ISR** (`revalidate = 120`) | Product PDP or CMS page. Category hits **redirect** to `/categories/:slug`. No `generateStaticParams`. |
| `/shop` | `app/shop/page.jsx` | **ISR** (inherits layout 60) | Server `fetchProductsServer`; listing is a client island. |
| `/products` | `app/products/page.jsx` | Dead in production if middleware runs | Middleware 301s `/products` → `/shop`. |
| `/products/[handle]` | `app/products/[handle]/page.jsx` | Redirect (308 via `permanentRedirect`) | Canonical `/:slug`. Middleware also 301s `/products/:handle` → `/:handle`. |
| `/categories` | `app/categories/page.jsx` | **ISR** (`revalidate = 60`) | Chrome SSR; category cards in client + Suspense. |
| `/categories/[slug]` | `app/categories/[slug]/page.jsx` | **SSG + ISR** | `generateStaticParams` + `revalidate = 120` + `dynamicParams = true`. See §3. |
| `/cars` | `app/cars/page.jsx` | **ISR** (`revalidate = 120`) | Vehicle index SSR with `next/image`. |
| `/cars/[slug]` | `app/cars/[slug]/page.jsx` | **ISR** (`revalidate = 60`) | Vehicle chrome SSR; product grid is client + Suspense skeletons. |
| `/sale` | `app/sale/page.jsx` | **ISR** (`revalidate = 120`) | Server fetches deals; grid in client Suspense. |
| `/blogs` | `app/blogs/page.jsx` | **SSR** (`force-dynamic`) | List body is **client-only** (`BlogListView` `useEffect` fetch). |
| `/blogs/[slug]` | `app/blogs/[slug]/page.jsx` | **SSR** (`force-dynamic`) | Post HTML is server-rendered (page is a server component). |
| `/about` | `app/about/page.jsx` | **SSR** (`force-dynamic`) | |
| `/about-us` | `app/about-us/page.jsx` | Redirect 308 | → `/about` (middleware also 301s). |
| `/contact` | `app/contact/page.jsx` | **SSR** (`force-dynamic`) | |
| `/faq` | `app/faq/page.jsx` | **SSG-like static** | Hardcoded FAQ array in the page module; no `revalidate` override (layout 60). |
| `/checkout` | `app/checkout/page.jsx` | Server shell, **client main** | `CheckoutView` is client. |
| `/checkout/success` | `app/checkout/success/page.jsx` | **SSR** (`force-dynamic`) | |
| `/cart` | `app/cart/page.jsx` | Redirect 308 | → `/shop` (middleware/next.config also). |
| `/search` | `app/search/page.jsx` | Redirect 308 | → `/shop?q=` |
| `/wishlist` | `app/wishlist/page.jsx` | **Client-only** | `"use client"` |
| `/compare` | `app/compare/page.jsx` | **Client-only** | |
| `/track-order` | `app/track-order/page.jsx` | Server chrome + client tracker | |
| `/order-confirmation` | `app/order-confirmation/page.jsx` | UNKNOWN — needs manual check of file body | File exists; not fully traced in this pass. |
| `/collections` | `app/collections/page.jsx` | Redirect 308 | → `/categories` |
| `/collections/[slug]` | `app/collections/[slug]/page.jsx` | **SSR redirect** (`force-dynamic`) | Resolves Shopify handle → category/car path, then `permanentRedirect` (308). |
| `/pages` | `app/pages/page.jsx` | Redirect 308 | → `/` |
| `/pages/[slug]` | `app/pages/[slug]/page.jsx` | Redirect 308 | → `/:slug` |
| `/posts`, `/posts/[slug]` | `app/posts/*` | Redirect 308 | → `/blogs` |
| `/blog` | `app/blog/page.jsx` | Redirect 308 | → `/blogs` |
| `/account/*` | `app/account/**` | **Client-only** (login/register/orders/etc.) | |
| `/sitemap.xml` | `app/sitemap.js` | **SSR** (`force-dynamic`) | |
| `/robots.txt` | `app/robots.js` | **SSR** (`force-dynamic`) | |

API routes under `app/api/**` are server Route Handlers (not indexable HTML). Not listed row-by-row.

### Where product data comes from

**Primary (live catalog):** MongoDB via Mongoose `Product` (`storecraft-store/lib/models/Product.model.js`). Typical storefront queries:

Category listing (`lib/storeCategoryData.js` → `loadStoreCategoryDetail`):

```335:351:storecraft-store/lib/storeCategoryData.js
  const productQuery = {
    status: ACTIVE,
    $or: [{ categories: { $in: allCategoryIds } }, { category: { $in: allCategoryIds } }],
  };

  const [products, productCount] = await Promise.all([
    Product.find(productQuery)
      .select(
        "name slug media.images pricing.regularPrice pricing.salePrice inventory featured newArrival status createdAt shortDescription articleNo categories rating averageRating ratingAverage reviewCount totalReviews numReviews"
      )
      .populate("categories", "name slug")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(productQuery),
  ]);
```

Shop / homepage cards (`lib/serverProductFetch.js`):

```14:40:storecraft-store/lib/serverProductFetch.js
export async function fetchProductsServer(params = {}) {
  try {
    await dbConnect();
    // ...
    const { rows, total } = await queryProductsWithSearch(Product, filter, q, {
      limit,
      skip,
      sortSpec,
      select: PRODUCT_CARD_SELECT,
      populate: "categories",
    });
```

PDP (`app/[slug]/page.jsx`): `Product.findOne({ slug, status })` / `findActiveProductBySlugParam`, then `serializeStoreProductDetail`.

**Seed / import JSON:** `crazzycars-products/data/products.json` mapped by `storecraft-store/scripts/products/seedProducts.mjs` (not used at request time).

**CMS:** store settings, banners, about copy live in Mongo `Settings` — not the product catalog.

**Optional Shopify Storefront GraphQL** (see below): only if `SHOPIFY_STORE_DOMAIN` and `SHOPIFY_STOREFRONT_ACCESS_TOKEN` are set. Homepage uses Shopify products only when `STORE_CATALOG === "shopify"`.

Whether production Coolify currently has Shopify env vars set: **UNKNOWN — needs manual check**.

### Shopify integration still in this codebase

Yes. It is a **leftover optional catalog/cart path**, not removed.

| Location | Role |
|----------|------|
| `lib/shopify.js` | `isShopifyEnabled()`, `shopifyFetch` → `https://${SHOPIFY_STORE_DOMAIN}/api/2025-07/graphql.json` |
| `lib/shopifyCart.js`, `app/actions/shopifyCart.js`, `lib/shopifyCartClient.js` | Storefront cart cookie `shopify_cart_id` |
| `components/store/ShopifyProductView.jsx` | Alternate PDP UI for `source: "shopify"` |
| `app/categories/[slug]/page.jsx` | If Mongo category miss **and** Shopify enabled → `getCollectionByHandle` |
| `app/page.jsx` | `STORE_CATALOG === "shopify"` → `getBestSellingProducts` / `getHotDealProducts` |
| `app/api/shopify/status/route.js` | `{ enabled: isShopifyEnabled() }` |
| `app/layout.js` | `shopifyEnabled={isShopifyEnabled()}` into `StoreProviders` |
| Seed data | `shopifyHandle` / `shopifyId` on categories and vehicles; `cdn.shopify.com` image URLs in seed JSON |
| `.env.local.example` | `SHOPIFY_STORE_DOMAIN=ji46dz-hs.myshopify.com` |
| `postex-shopify-middleware/` | Separate Node app for PostEx ↔ Shopify orders |

Core fetch:

```41:55:storecraft-store/lib/shopify.js
export async function shopifyFetch({ query, variables = {}, tags = [], revalidate = 300 }) {
  if (!isShopifyEnabled()) return null;
  const response = await fetch(
    `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/${API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN,
      },
```

---

## 2. Routing map

| Pattern | Purpose | Main content SSR vs client |
|---------|---------|----------------------------|
| `/` | Homepage | Data fetched on server; **product grids rendered by client components** (`HomePage` + `next/dynamic`). |
| `/[slug]` | Product PDP (canonical) or CMS page | **Server** product HTML via `ProductDetailMedico` (that component is still `"use client"`, so first paint is SSR of a client tree). |
| `/categories` | Category index | H1 SSR; **cards behind Suspense + client**. |
| `/categories/[slug]` | Category listing | H1/hero SSR; **product grid client** (see §3). JSON-LD CollectionPage includes product names/URLs. |
| `/cars` | Vehicle index | **Server** (links + images). |
| `/cars/[slug]` | Vehicle listing | Hero/FAQ **server**; **products behind Suspense skeletons**. |
| `/shop` | All products | Server fetch; **grid client** (`ProductsBrowseMedico` + `useSearchParams`). |
| `/sale` | Deals | Server fetch; **grid client**. |
| `/blogs` | Blog index | **Client fetch only** (`useEffect` → `/api/blog`). |
| `/blogs/[slug]` | Article | **Server**. |
| `/about`, `/contact`, `/faq` | Info | **Server** (FAQ copy is hardcoded in the page). |
| `/checkout` | Checkout | **Client**. |
| `/track-order` | Tracking | Client tracker. |
| `/wishlist`, `/compare`, `/account/*` | Account/tools | **Client**. |
| `/collections/:handle` | Legacy Shopify | Redirect only. |
| `/products/:handle` | Legacy Shopify PDP | Redirect only. |

Canonical product URL in code is `/{slug}` (`lib/productPath.js`), not `/products/{handle}`.

---

## 3. The category page problem

Products **are** loaded on the server. They **do not** appear in the crawlable listing HTML because the grid is a Client Component that uses `useSearchParams()`, which Next.js requires to sit in `<Suspense>`. The Suspense **fallback is “Loading products…”** and contains **no product links**. The server chrome does **not** render a product list.

### Fetch is on the server

`app/categories/[slug]/page.jsx` → `loadStoreCategoryDetail` (Mongo `Product.find`, quoted in §1).

### Grid is behind `"use client"` + Suspense

```223:245:storecraft-store/app/categories/[slug]/page.jsx
        <CategoryPageChrome
          category={data.category}
          subcategories={data.subcategories}
          products={data.products}
          brand={brand}
        />
        <Suspense
          fallback={
            <div className="mx-auto max-w-7xl px-4 py-16 text-sm text-[#6B7280]">
              Loading products…
            </div>
          }
        >
          <CategoryDetailPageClient
            initialCategory={data.category}
            initialSubcategories={data.subcategories}
            initialProducts={data.products}
```

`CategoryPageChrome` only outputs breadcrumb + hero H1. It receives `products` solely to pick a **hero image**, not to list items (`CategoryHeroBanner.jsx` `productImageUrls`).

`CategoryDetailPageClient.jsx` line 1: `"use client"`. It calls `useSearchParams()` (lines 73–86). That is why Suspense exists.

It **does** seed from `initialProducts` (no `useEffect` for the default first page). Extra sorts/pages **do** `fetch('/api/products?...')` in `useEffect` (lines 137–156).

`ProductCard` is also `"use client"`.

### Same pattern elsewhere

- `/shop` — `Suspense` fallback is pulse skeletons (`app/shop/page.jsx`); `ProductsBrowseMedico` uses `useSearchParams`.
- `/cars/[slug]` — `VehicleProductsListing` wraps the grid in Suspense with **8 skeleton cards**, no product links (`components/cars/VehicleProductsListing.jsx` 153–166).
- `/categories` index — fallback “Loading categories…”.
- Homepage — `HomePage` is `"use client"` and `next/dynamic`s Hot Deals / Best Sellers / Category grid with skeleton `loading` fallbacks.

JSON-LD `CollectionPage` **does** embed product `name` + `url` from the server `products` array (`lib/seo/jsonld.js` `collectionPageJsonLd`). That is structured data, not visible listing HTML.

---

## 4. Product data shape

There is **no TypeScript interface**. Reconstructing the Mongoose schema (`lib/models/Product.model.js`) as a type:

```ts
type ProductImage = {
  url: string;
  publicId: string;
  originalSize?: number;
  finalSize?: number;
  isMain: boolean;
  altText: string;
  imageName: string;
  width?: number;
  height?: number;
  focalPoint?: { x?: number; y?: number };
};

type SimpleVariation = { name: string; enabled: boolean; tags: string[] };

type VariationCombination = {
  options: { name: string; value: string }[];
  priceDelta: number;
  weightDelta: number;
  price: number;
  compareAtPrice: number;
  weight: number;
  stock: number;
  sku: string;
  image: string; // URL string, not an image object
};

type Product = {
  name: string;
  slug: string;
  previousSlugs: string[];
  articleNo: string;
  ean: string;
  partNumber: string;
  condition: "new" | "used" | "refurbished";
  categories: ObjectId[];
  shortDescription: string;
  longDescription: string;
  pricing: {
    regularPrice: number;
    salePrice?: number;
    costPerItem: number;
    saleSchedule: { enabled: boolean; startDate?: Date; endDate?: Date };
  };
  inventory: {
    quantity: number;
    weight?: number;
    weightUnit: "kg" | "g" | "lb" | "oz";
    trackInventory: boolean;
    allowBackorder: boolean;
    lowStockThreshold: number;
    sku: string;
  };
  media: {
    images: ProductImage[];
    videos: unknown[];
    videoUrl: string;
    videoType: "youtube" | "mp4" | "";
  };
  variations: Array<{
    type: string;
    name: string;
    options: unknown[];
    additionalPrice: number;
    quantity: number;
  }>;
  simpleVariations: SimpleVariation[];
  variationCombinations: VariationCombination[];
  addOns: { name: string; price: number; required: boolean }[];
  customSizing: {
    enabled: boolean;
    title: string;
    description: string;
    unit: "cm" | "inches" | "both";
    fields: Array<{ fieldName: string; label: string; placeholder: string; required: boolean; minValue?: number; maxValue?: number; helpText: string }>;
  };
  features: string[];
  specifications: { label: string; value: string }[];
  seo: { metaTitle: string; metaDescription: string; metaKeywords: string[] };
  metaTitle: string;
  metaDescription: string;
  isUniversal: boolean;
  compatibleVehicles: ObjectId[]; // Vehicle refs
  compatibleCars: { make: string; model: string; generation: string; yearFrom: number | null; yearTo: number | null }[];
  vehicleCompatibility: {
    fitmentType: "universal" | "specific" | "semi-universal";
    universalNote: string;
    vehicles: { make: string; model: string; yearFrom: number | null; yearTo: number | null; bodyStyle: string; notes: string }[];
    categories: string[];
  };
  status: "active" | "inactive" | "draft";
  featured: boolean;
  isFeatured: boolean;
  isDeal: boolean;
  newArrival: boolean;
  codEnabled: boolean;
  advancePercentRequired: number;
  productType: string;
  vendor: string;
  collections: string[];
  tags: string[];
  rating: number;
  averageRating: number;
  ratingAverage: number;
  reviewCount: number;
  numReviews: number;
  totalReviews: number;
  restockRequested: boolean;
};
```

**Reviews** are a **separate** `Review` collection (`lib/models/Review.model.js`): `product`, `reviewer.{name,email,location,avatar,verified}`, `rating`, `title`, `body`, `images`, `status`, `featured`, `adminReply`, `source`, `helpfulVotes`, `orderId`. Product documents only store **denormalized counts/averages** (`rating`, `averageRating`, `reviewCount`, …).

### SEO-relevant fields that DO NOT currently exist (as first-class schema)

| Missing field | Notes |
|---------------|--------|
| `brand` | Only `vendor` (string). JSON-LD Brand is hardcoded `"CrazzyCars.pk"` unless overridden in the serializer. |
| `gtin` / barcode as required | `ean` exists but is optional/empty on most seed rows — **UNKNOWN** how many live products have it. |
| Dedicated `material` | Only free-text `specifications[]` or a variant axis (seed even uses `"Meterial"`). |
| Dedicated `dimensions` (L×W×H) | Only `inventory.weight` and optional `customSizing` (body-kit measurements). |
| `warranty` | Not on the schema. |
| `color` as a product field | Only variation tags. |
| JSON-LD `ProductGroup` / `hasVariant` | Combinations exist in Mongo; structured data is a single `Product` + `Offer`. |
| JSON-LD `Review[]` | Only `AggregateRating` when counts > 0. |
| `isAccessoryOrSparePartFor` / vehicle schema.org | Fitment is custom Mongo, not schema.org Vehicle. |
| `OfferShippingDetails` | Shipping is settings/zones, not on the product. |
| `ItemList` on PDP | N/A |

Duplicate review fields (`reviewCount` vs `numReviews` vs `totalReviews`; `rating` vs `averageRating` vs `ratingAverage`) increase the chance of **wrong or zero** stars in UI/JSON-LD.

---

## 5. Variant bug investigation

### How options are modelled

Storefront UI (`ProductVariations.jsx`, `ProductDetailMedico.jsx`) uses:

- `simpleVariations[]`: `{ name, enabled, tags[] }` — **one dropdown per `name`**
- `variationCombinations[]`: `{ options: [{ name, value }], price, stock, sku, image, ... }`

A second legacy array `variations[]` exists on the schema and is **not** what the Medico PDP dropdowns read (except a `variationTypes` fallback check).

Shopify products use `variants[].selectedOptions` in `mapShopifyProduct`.

Admin can also inject published **Product Options** (`VariationsSection.jsx` fetches `/api/product-options` and appends axes by `option.name`).

### Root cause of Color vs Option + `white-1`

**Transform:** `storecraft-store/scripts/products/seedProducts.mjs` `mapVariants`:

```58:74:storecraft-store/scripts/products/seedProducts.mjs
function mapVariants(variants) {
  if (!Array.isArray(variants) || !variants.length) {
    return { simpleVariations: [], variationCombinations: [] };
  }
  const axisMap = new Map();
  for (const v of variants) {
    const name = String(v.optionName || "Option").trim() || "Option";
    const value = String(v.optionValue || "").trim();
    if (!value) continue;
    if (!axisMap.has(name)) axisMap.set(name, new Set());
    axisMap.get(name).add(value);
  }
  const simpleVariations = [...axisMap.entries()].map(([name, tags]) => ({
    name,
    enabled: true,
    tags: [...tags],
  }));
```

**Source data** (example: universal front bumper splitter) in `crazzycars-products/data/products.json`:

```13212:13236:crazzycars-products/data/products.json
  "variants": [
   {
    "optionName": "Color",
    "optionValue": "black",
    ...
   },
   {
    "optionName": null,
    "optionValue": "red",
    ...
   },
   {
    "optionName": null,
    "optionValue": "white-1",
    ...
   }
  ],
```

1. Shopify/export left **`optionName` only on the first variant**. Later rows are `optionName: null`.
2. The mapper uses `v.optionName || "Option"`, so **black** lands on axis `"Color"` and **red** / **white-1** land on a **second** axis `"Option"`.
3. `optionValue` is stored **verbatim**. `"white-1"` is a Shopify handle/slug, never title-cased to `"White"`.
4. The UI prints `variation.name` and `tag` with no display-label map (`ProductVariations.jsx` options `{tag}`).

This pattern (`optionName: null` on subsequent variants) is **repeated across `products.json`** (Finish, Design, Company, Color, etc.).

Whether **live Mongo** still has this split for that SKU: **UNKNOWN — needs manual check** (catalog may have been edited in admin after seed).

---

## 6. SEO surface

### Metadata

- **Next.js Metadata API:** `generateMetadata` and `export const metadata` + `buildPageMetadata` (`lib/pageMetadata.js`).
- **No `next-seo` package.**
- Root `app/layout.js` `generateMetadata` sets default title template / robots from Mongo `Settings.seo`. Comment: do **not** set a sitewide canonical there (homepage sets its own).
- Product titles: `app/[slug]/page.jsx` `buildProductSeoTitle` (60-char budget + ` | CrazzyCars.pk`).
- Shop facet URLs: `noIndex` + canonical to clean `/shop`.

### JSON-LD schema types found

| `@type` | Where |
|---------|--------|
| `AutoPartsStore` | `lib/seo/jsonld.js` `organizationJsonLd` → root layout |
| `WebSite` + `SearchAction` | `websiteJsonLd` → root layout |
| `Product` + `Offer` + `Brand` + `Organization` + `MerchantReturnPolicy` + optional `AggregateRating` | `productJsonLd` → PDP |
| `BreadcrumbList` / `ListItem` | product, category, car pages |
| `CollectionPage` + `ItemList` + nested `Product` | category + car listing |
| `FAQPage` + `Question` + `Answer` | `/faq`, `/cars/[slug]` |
| `BlogPosting` + `Person` + `Organization` + `ImageObject` + `WebPage` | `app/blogs/[slug]/page.jsx` |
| `Country`, `PostalAddress` | organization |

**Invented JSON-LD (not from product data):** `merchantReturnDays: 7`; `priceValidUntil` defaults to **today + 1 year** if unset (`lib/seo/jsonld.js`).

### Sitemap

`app/sitemap.js` (`force-dynamic`). Includes:

- Static: `/`, `/shop`, `/categories`, `/cars`, `/blogs`, `/sale`, FAQ/about/contact, policy slugs, `/llms.txt`, `/feed/products.xml`
- **Active products** → `/{slug}`
- **Active categories that have products** (including parents of child shelves) → `/categories/{slug}`
- **Active vehicles that have ≥1 compatible product** → `/cars/{slug}`
- Published blogs and CMS pages

Empty categories/vehicles are omitted (comment: crawl budget).

### robots.txt

Generated by `app/robots.js`. When `isIndexableEnvironment()` is false: `User-agent: *` / `Disallow: /` plus sitemap URL.

When indexable, equivalent of:

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /account/
Disallow: /checkout/
Disallow: /cart/
Disallow: /admin/
Disallow: /wishlist
Disallow: /compare
Disallow: /search

# plus the same allow/disallow repeated for named AI crawlers
# (GPTBot, ChatGPT-User, OAI-SearchBot, PerplexityBot, Google-Extended,
#  Googlebot, ClaudeBot, Claude-Web, anthropic-ai, Bingbot, Applebot, Applebot-Extended)

Sitemap: {configuredSiteUrl}/sitemap.xml
Host: crazzycars.pk
```

Exact live `robots.txt` if `NEXT_PUBLIC_INDEXABLE` is wrong on a host: **UNKNOWN — needs manual check**.

### Redirect config

**`next.config.mjs` `redirects()`** (SEO hops use `statusCode: 301`; track aliases `permanent: false` = 307):

- `/posts`, `/posts/:slug` → `/blogs`, `/blogs/:slug`
- `/pages/track-your-order` → `/track-order`
- `/pages/contact-1` → `/contact`
- `/pages/shipping-and-delivery-policy` → `/shipping-policy`
- `/pages/return-refund-policy` → `/returns-policy`
- `/pages/terms-of-service` → `/terms-conditions`
- `/pages/:slug` → `/:slug`
- `/blogs/news`, `/blog/news` → `/blogs`
- `/cart` → `/shop`
- `/search` → `/shop`
- `/collection/:slug` → `/collections/:slug`
- `/categories/head-lights` → `/categories/led-headlights-bulbs`
- fragrance/mat empty shelves → parent categories
- `/tracking`, `/track` → `/track-order` (temporary)

`/products/:slug` is **intentionally not** in next.config (comment: query-string noise); handled in middleware.

**`middleware.js`:** default `redirectPath(..., 301)`. Includes www → apex 301; case folding; `/posts` → `/blogs`; `/about-us` → `/about`; `/pages/:slug` → `/:slug`; `/collection/` → `/collections/`; category merges; `/products` → `/shop`; `/products/:handle` → `/:handle`; strip Shopify/UTM query keys (301). Account auth redirects use default **307**.

**`vercel.json`:** no redirects. Only Next.js build + crons (`/api/cron/blog`, `/api/cron/abandoned-carts`).

**App `permanentRedirect()` (308):** `[slug]` previous-slug/category, `products/[handle]`, `collections/[slug]`, `posts`, `pages`, `cart`, `search`, `about-us`, `blog`.

---

## 7. Hardcoded content inventory

Searched `storecraft-store` (and seed scripts). CMS/Mongo copy can override some UI; **live Settings values are UNKNOWN**.

### Review counts / stars not from data

| File | Line | What |
|------|------|------|
| `components/home/ReviewsCarousel.jsx` | 61 | `i < (rating \|\| 5)` — missing rating renders **5 filled stars** |
| `components/home/ReviewsCarousel.jsx` | 185 | Decorative `★★★★★` heading, not an average from DB |
| `components/store/FeaturedReviews.jsx` | 40 | “Real reviews from real customers” (reviews themselves are fetched) |

Product cards use `product.reviewCount` / `product.rating` from Mongo (can be stale/zero). Homepage FeaturedReviews / ReviewsCarousel load `/api/reviews` **client-side** (not in SSR HTML).

### “People viewing” counters

No `LiveProductViewers` / “people viewing this now” in the current tree (component removed). `LivePresenceClient` / `app/api/presence` exist for **session presence**, not a PDP viewer count.

Whether an older deploy still shows the counter: **UNKNOWN — needs live HTML check**.

### Customer count / “thousands” / millions

No `"10,000+"` / `"millions of customers"` / `"393+"` string in storefront JS. Homepage stats come from Settings `brandStory.stats` / `stats`, with product-count labels rewritten from **live** `Product.countDocuments` (`lib/homepageStats.js`). **UNKNOWN** whether CMS still stores invented customer totals.

### Product count claims

`formatActiveProductStat` appends `+` to the live count (e.g. `234+`). Not a hardcoded 393.

### Years-in-business

No “since 20xx” / “X years in business” found in storefront components. About defaults mention Gujranwala founding without a year (`AboutPageView.jsx`, `Settings.model.js` story defaults).

### Testimonials with hardcoded names

No hardcoded person names found. Names come from `Review.reviewer.name` after fetch. **UNKNOWN** whether imported reviews are genuine.

### Return window (“7 day”, “14 day”, …)

| File | Line | Text |
|------|------|------|
| `components/store/ProductDetailMedico.jsx` | 68 | Default trust badge `"7 Day Returns"` |
| `components/store/ProductDetailMedico.jsx` | 1615 | `"7-day return policy from delivery date"` |
| `lib/seo/jsonld.js` | 89 | `merchantReturnDays: 7` |
| `scripts/seed-policy-pages.mjs` | 166–170 | `"7-day return window"` / `"within 7 days"` |
| `app/faq/page.jsx` | 40–42 | Returns FAQ points at Returns page; **no day count** in the FAQ answer |

`middleware.js` / `lib/aiAttribution.js` “14-day” is **cookie attribution**, not a customer-facing return claim.

### Shipping / free-shipping thresholds

| File | Line | What |
|------|------|------|
| `lib/freeDelivery.js` | 6, 14–16, 28 | Defaults **9999** / **10000** |
| `lib/normalizeStoreSettings.js` | 91–104 | Same defaults |
| `lib/models/Settings.model.js` | 72–94 | Schema defaults 9999 / 10000 |
| `lib/constants.js` | 104, 127, 135 | Zone examples `freeShippingThreshold: 2999` / `5000` |
| `app/api/store/shipping-banner/route.js` | 52, 81 | Builds “Free delivery on orders over Rs. …” or fallback `"typically Rs. 250"` |
| `app/faq/page.jsx` | 21–22 | `"typically Rs. 250"` |
| `app/cars/[slug]/page.jsx` | 124 | COD Rs. 9,999 / Rs. 500 advance |
| `app/llms.txt/route.js` | 70 | Same COD/free-delivery copy |
| `scripts/seed-policy-pages.mjs` | 29 | `FREE_DELIVERY_RS = 9999` |
| Checkout/cart | various | Free-delivery progress from **settings**, not a single hardcoded marketing line |

`CheckoutView.jsx` ~1625 shows free delivery when settings enable it (data-layer). Defaults above still ship in code if Settings are empty.

### Other trust-adjacent hardcoded PDP copy

`ProductDetailMedico.jsx` 66–70: “Premium Quality”, “100% Secure Checkout”, “Fast Dispatch” as **default** badges if Settings omit them.

---

## 8. Multi-site setup

**This repo is not a multi-domain switcher** for sialkotmotorsports.com, gujranwalamotorsports.com, or autoaestheticstore.com.

- Grep of those hostnames: **no matches**.
- Canonical host is hardcoded **`crazzycars.pk`** (`lib/siteUrl.js` `CANONICAL_HOST`, `app/robots.js` `host`).
- Brand/name/URL come from **env** (`NEXT_PUBLIC_STORE_NAME`, `NEXT_PUBLIC_STORE_URL`, `SITE_URL`, `NEXT_PUBLIC_SITE_URL`) plus Mongo **Settings**.
- Middleware only special-cases `www.crazzycars.pk` → apex.
- Leftover **old brand** artifacts: `sialkot_wishlist` / `sialkot_compare` localStorage keys; Cloudinary path scrub `storecraft/sialkotmotorsports` → `storecraft/crazzycars` (`lib/cloudinaryImage.js`).
- README still mentions `https://storecraft-store-iota.vercel.app` as a temporary URL.
- `postex-shopify-middleware` is a **separate** Shopify/PostEx service, not a second storefront theme.

Per-domain config for other brands would require **separate deployments/env**, not host detection. Whether those domains still DNS to this app: **UNKNOWN — needs manual check**.

---

## 9. Performance

### `next/image` vs raw `<img>`

`next/image` is used in **four** modules: `app/cars/page.jsx`, `app/cars/[slug]/page.jsx`, `components/home/ShopByVehicle.jsx`, `components/store/MegaMenu.jsx`.

Product cards, PDP gallery, category hero, homepage hero, blog, header/footer logos, cart thumbs use **raw `<img>`** (often via `WatermarkedImage.jsx`). `next.config.mjs` still configures `images.remotePatterns` (Cloudinary, Shopify CDN, Wikimedia) and webp/avif — mostly unused on PDPs.

### Cloudinary transforms

`lib/cloudinaryImage.js` applies `f_auto`, `q_auto` / `q_auto:eco`, `w_*`, `c_fill`/`c_limit` when the URL matches `res.cloudinary.com/.../upload/`.

- Product cards (`WatermarkedImage` + `cardImageUrl`) **do** use this when `optimize` is true.
- Not consistent: Shopify `cdn.shopify.com` URLs are passed through unchanged; some emails inject their own `/upload/w_160,...` transforms; Category hero uses `categoryBannerUrl` (good) plus unoptimized logo `<img>`.

Whether every live product image is on Cloudinary: **UNKNOWN — needs manual check** (seed still contains Shopify CDN URLs).

### Render-blocking / heavy client trees

- Google fonts Inter + Rajdhani in root layout (`display: "swap"`).
- Entire homepage is a Client Component; Hot Deals / Best Sellers / categories / shop-by-car are `next/dynamic` with skeleton fallbacks.
- `ProductDetailMedico.jsx` is a large `"use client"` PDP (gallery, cart, variations, reviews).
- `StoreHeader` in Suspense; mega menu can fetch categories client-side if tree missing.
- `optimizeCss: true` (critters) is on in `next.config.mjs`.
- Layout `revalidate = 60` helps TTFB vs `force-dynamic`, but PDP/category listing still hydrates large client islands.
- Fake countdown on Hot Deals: `useState(6 * 60 * 60)` ticking every second (`HotDeals.jsx`) — extra client work, not from data.

---

## 10. Highest-impact issues (SEO / revenue)

Ranked by likely Google/crawl and conversion impact.

1. **Category (and shop/car) product grids missing from server HTML** — Suspense fallback `"Loading products…"` / skeletons; chrome has no product `<a>` list. Directly blocks category SEO and internal linking. (§3)

2. **Homepage product sections are client/`next/dynamic` islands** — crawlers may see skeletons instead of Hot Deals / Best Sellers. Homepage is the strongest internal link hub.

3. **Blog index is `useEffect`-only** — `/blogs` SSR body has no posts until JS. Wastes a high-intent content URL.

4. **Variant mapper splits one Shopify option into `Color` + `Option` and leaks slugs like `white-1`** — customers cannot pick a colour coherently; add-to-cart matching can fail. (`mapVariants` + `products.json`)

5. **JSON-LD invents return window and price validity** (`merchantReturnDays: 7`, `priceValidUntil` = +1 year) — Merchant listings / rich results risk if policy differs; conflicts with “never invent specs/trust”.

6. **App Router product/legacy redirects still 308** (`permanentRedirect`) while the SEO spec requires 301. Middleware/next.config were moved to 301; RSC hops were not.

7. **Two variation systems + unique `articleNo` vs variant `sku`** — a parent product and a standalone SKU can both sell the same physical item on two live URLs. Canonical rule (“one URL per product”) is not enforced in data. Live duplication: **UNKNOWN — needs Mongo check**.

8. **Shopify leftover path** — if env tokens are present, category 404s can silently serve Shopify collections; homepage can switch catalog via `STORE_CATALOG`. Split crawl / mixed URLs.

9. **Hardcoded “7 Day Returns” and default free-shipping thresholds (Rs. 9,999 / 10,000)** on PDP/JSON-LD/FAQ-adjacent copy — trust and Merchant Center mismatch if Settings/policy differ.

10. **Almost no `next/image` on product imagery; mixed Shopify CDN vs Cloudinary** — oversized images on slow Pakistani mobile; LCP on PDP/category likely raw Cloudinary or untransformed Shopify files.

---

## Open items after origin/vps-test merge (18 Aug 2026)

Not fixed in the merge. Both branches already had these gaps.

1. **Checkout has no payment-write idempotency.** `POST /api/checkout` does not take a client idempotency key and does not look up an existing order before `Order.create`. A retried request (slow network, double-click, doubled webhook) can create two orders for one checkout.

2. **`variationCombinations[].price` / `combinationUnitPrice` is unused at checkout.** Server prices from `effectiveUnitPrice`, variant `price`, or option `additionalPrice` only. If any live product prices by combination rather than variant/option, checkout is already wrong on both branches. Confirm against live catalog before changing pricing.

---

*End of audit. No application code was changed in this phase other than adding this report file.*
