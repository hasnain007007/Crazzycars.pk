# S3 dry-run: legacy non-car + empty categories

**Status:** proposal only — NOT applied. Awaiting future GO.

## A. Legacy non-car categories → propose 410

Kitchen/beauty/fragrance leaf categories with 0 products (mostly already `inactive`).

| Slug | Name | Status | Products | Proposal |
|------|------|--------|----------|----------|
| `fragrances` | Fragrances | active | 0 | **410** `/categories/fragrances` |
| `hanging-perfumes` | Hanging Perfumes | active | 0 | **410** `/categories/hanging-perfumes` |
| `fancy-air-fresheners` | Fancy Air Fresheners | active | 0 | **410** `/categories/fancy-air-fresheners` |
| `kitchen-accessories` | Kitchen Accessories | inactive | 0 | **410** `/categories/kitchen-accessories` |
| `cookware` | Cookware | inactive | 0 | **410** `/categories/cookware` |
| `storage-containers` | Storage & Containers | inactive | 0 | **410** `/categories/storage-containers` |
| `cutlery-gadgets` | Cutlery & Gadgets | inactive | 0 | **410** `/categories/cutlery-gadgets` |
| `dining-serveware` | Dining & Serveware | inactive | 0 | **410** `/categories/dining-serveware` |
| `beauty-bags` | Beauty Bags | inactive | 0 | **410** `/categories/beauty-bags` |
| `makeup-pouches` | Makeup Pouches | inactive | 0 | **410** `/categories/makeup-pouches` |
| `travel-toiletry-bags` | Travel Toiletry Bags | inactive | 0 | **410** `/categories/travel-toiletry-bags` |
| `vanity-organizer-bags` | Vanity/Organizer Bags | inactive | 0 | **410** `/categories/vanity-organizer-bags` |
| `mini-handbags` | Mini Handbags | inactive | 0 | **410** `/categories/mini-handbags` |

### Related GSC URLs (Pages.csv hits)

- https://crazzycars.pk/categories/cutlery-gadgets
- https://crazzycars.pk/categories/fragrances
- https://crazzycars.pk/categories/makeup-pouches

## B. Empty car-related categories → propose noindex + remove from nav/sitemap

Total empty car-ish categories by `categories[]` ObjectId join: **36**.
Currently in `sitemap-categories.xml`: **1**. Already absent from sitemap: **35**.

| Slug | Name | In sitemap? | Proposal |
|------|------|-------------|----------|
| `car-care-safety` | Car Care & Safety | yes | noindex + remove from nav/sitemap (keep URL 200 soft or 404 per later GO) |
| `antennas` | Antennas | no | noindex + remove from nav/sitemap (keep URL 200 soft or 404 per later GO) |
| `door-guards` | Door Guards | no | noindex + remove from nav/sitemap (keep URL 200 soft or 404 per later GO) |
| `stickers-monograms-emblems` | Stickers, Monograms & Emblems | no | noindex + remove from nav/sitemap (keep URL 200 soft or 404 per later GO) |
| `seat-covers` | Seat Covers | no | noindex + remove from nav/sitemap (keep URL 200 soft or 404 per later GO) |
| `seat-belt-accessories` | Seat Belt Accessories | no | noindex + remove from nav/sitemap (keep URL 200 soft or 404 per later GO) |
| `tissue-boxes` | Tissue Boxes | no | noindex + remove from nav/sitemap (keep URL 200 soft or 404 per later GO) |
| `ashtrays` | Ashtrays | no | noindex + remove from nav/sitemap (keep URL 200 soft or 404 per later GO) |
| `back-neck-care` | Back & Neck Care | no | noindex + remove from nav/sitemap (keep URL 200 soft or 404 per later GO) |
| `shift-knob-accessories` | Shift Knob Accessories | no | noindex + remove from nav/sitemap (keep URL 200 soft or 404 per later GO) |
| `led-sill-plates` | LED Sill Plates | no | noindex + remove from nav/sitemap (keep URL 200 soft or 404 per later GO) |
| `shampoo-foam` | Shampoo & Foam | no | noindex + remove from nav/sitemap (keep URL 200 soft or 404 per later GO) |
| `car-polish-wax` | Car Polish & Wax | no | noindex + remove from nav/sitemap (keep URL 200 soft or 404 per later GO) |
| `scratch-swirl-restore` | Scratch & Swirl Restore | no | noindex + remove from nav/sitemap (keep URL 200 soft or 404 per later GO) |
| `microfiber-accessories` | Microfiber Accessories | no | noindex + remove from nav/sitemap (keep URL 200 soft or 404 per later GO) |
| `all-purpose-cleaners` | All Purpose Cleaners | no | noindex + remove from nav/sitemap (keep URL 200 soft or 404 per later GO) |
| `engine-cleaners` | Engine Cleaners | no | noindex + remove from nav/sitemap (keep URL 200 soft or 404 per later GO) |
| `windshield-glass-wash` | Windshield & Glass Wash | no | noindex + remove from nav/sitemap (keep URL 200 soft or 404 per later GO) |
| `pressure-washers` | Pressure Washers | no | noindex + remove from nav/sitemap (keep URL 200 soft or 404 per later GO) |
| `wheel-tyre-care` | Wheel & Tyre Care | no | noindex + remove from nav/sitemap (keep URL 200 soft or 404 per later GO) |
| `polisher-machines-buffers` | Polisher Machines & Buffers | no | noindex + remove from nav/sitemap (keep URL 200 soft or 404 per later GO) |
| `jump-starters-booster-cables` | Jump Starters & Booster Cables | no | noindex + remove from nav/sitemap (keep URL 200 soft or 404 per later GO) |
| `air-compressors-inflators` | Air Compressors & Inflators | no | noindex + remove from nav/sitemap (keep URL 200 soft or 404 per later GO) |
| `power-inverters` | Power Inverters | no | noindex + remove from nav/sitemap (keep URL 200 soft or 404 per later GO) |
| `dash-cameras` | Dash Cameras | no | noindex + remove from nav/sitemap (keep URL 200 soft or 404 per later GO) |
| `android-lcd-panels` | Android LCD Panels | no | noindex + remove from nav/sitemap (keep URL 200 soft or 404 per later GO) |
| `security-gadgets` | Security Gadgets | no | noindex + remove from nav/sitemap (keep URL 200 soft or 404 per later GO) |
| `mobile-holders-chargers` | Mobile Holders & Chargers | no | noindex + remove from nav/sitemap (keep URL 200 soft or 404 per later GO) |
| `ac-grill-perfumes` | AC Grill Perfumes | no | noindex + remove from nav/sitemap (keep URL 200 soft or 404 per later GO) |
| `car-curtains` | Car Curtains | no | noindex + remove from nav/sitemap (keep URL 200 soft or 404 per later GO) |
| `bumper-protectors` | Bumper Protectors | no | noindex + remove from nav/sitemap (keep URL 200 soft or 404 per later GO) |
| `luxury-7d-9d-floor-mats` | Luxury 7D / 9D Floor Mats | no | noindex + remove from nav/sitemap (keep URL 200 soft or 404 per later GO) |
| `trunk-mats` | Trunk Mats | no | noindex + remove from nav/sitemap (keep URL 200 soft or 404 per later GO) |
| `car-organizers` | Car Organizers | no | noindex + remove from nav/sitemap (keep URL 200 soft or 404 per later GO) |
| `mirror-hangings` | Mirror Hangings | no | noindex + remove from nav/sitemap (keep URL 200 soft or 404 per later GO) |
| `dashboard-perfumes` | Dashboard Perfumes | no | noindex + remove from nav/sitemap (keep URL 200 soft or 404 per later GO) |

## C. Non-car active products

Mongo scan for kitchen/beauty product titles among `status:active`: **0** hits.
Legacy issue is category/nav/sitemap leftovers, not live PDPs.

## D. Notes
- Fragrance redirects already map `/categories/fragrances` and `/categories/hanging-perfumes` → air-freshener (DELETED_URL_REDIRECTS). Prefer keep those 308s over 410 unless you want Gone.
- Product↔category join uses `products.categories: [ObjectId]`. Counts may under-count if some products only use slug strings (none found in sample).
