# Prev / Next neighbors — 2026-11-05

## Phase 0 audit (summary)

### Admin page-based (wired)
| Entity | Detail | List orderBy | Label |
|--------|--------|--------------|-------|
| Orders | `/orders/[id]` | createdAt -1 *(pre-existing)* | orderNumber |
| Products | `/catalog/products/[id]` | createdAt -1 *(pre-existing)* | name |
| Coupons | `/coupons/[id]` | createdAt -1 | code |
| Blog | `/blog-manager/[id]` | publishedAt -1, createdAt -1 | title |
| Banners | `/banners/[id]` | sortOrder 1, createdAt -1 | name |
| Categories | `/catalog/categories/[id]/edit` | level, sortOrder, name | name |
| Customers | `/customers/[id]` | createdAt -1 | name |
| Users | `/users/[id]` | createdAt -1 | name |
| Invoices | `/invoices/[id]` | createdAt -1 | invoiceNumber |
| Redirects | `/redirects/[id]` | updatedAt -1 | fromPath |
| Pages-manager | `/pages-manager/[id]` | updatedAt -1 | title |
| Product options | `/product-options/[id]/edit` | sortOrder 1, createdAt 1 | name |
| Settlements | `/finance/settlements/[id]` | cprDate -1, createdAt -1 | cprNumber |

### Admin modal / inline (partial or skip)
| Entity | Notes |
|--------|-------|
| Abandoned carts | Prev/Next inside detail modal (current page list order) |
| Reviews | Inline form — **skipped** (no stable detail id URL; list reorder on filter) |
| Featured media / Shipping / Car catalog / Social / `/pages` CMS | Inline/modal only — **skipped** per hard rule (no `/[id]` route) |
| `/shipping/[id]` | Redirect stub only — skip |

### Storefront (wired)
| Entity | Route | List orderBy | Href |
|--------|-------|--------------|------|
| Products | `/{slug}` | createdAt -1 (shop default) | `/{slug}` |
| Blog | `/blogs/[slug]` | publishedAt -1, createdAt -1 | `/blogs/{slug}` |
| Categories | `/categories/[slug]` | level, sortOrder, name | `/categories/{slug}` |
| Cars | `/cars/[slug]` | make, model, yearFrom | `/cars/{slug}` |
| CMS (flat) | `/{slug}` | updatedAt -1 | `/{slug}` |
| CMS (`/pages`) | `/pages/[slug]` | updatedAt -1 | `/pages/{slug}` |
| City | `/car-accessories-{city}` | `CITY_LANDING_SLUGS` array | cityPath |

Legacy `/posts/[slug]`, `/products/[handle]`, `/collections/[slug]` — redirect-only; not duplicated.
