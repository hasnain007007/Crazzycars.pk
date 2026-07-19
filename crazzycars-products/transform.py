#!/usr/bin/env python3
"""Transform Shopify CSV export + live collection memberships -> products.json seed."""
import pandas as pd, json, re, html

CSV = "/mnt/user-data/uploads/products_export_1__3_.csv"
MEMBERS = "/home/claude/crazzycars-products/data/collection_memberships.json"
OUT = "/home/claude/crazzycars-products/data/products.json"

# Collection handle -> category slug (matches crazzycars-categories seed)
CAT_MAP = {
    "body-kits-extensions": "body-kits-extensions",
    "car-splitters-side-skirts": "splitters-side-skirts",
    "car-spoilers-diffusers": "spoilers-diffusers",
    "carbon-fiber-side-mirror-covers": "side-mirror-covers",
    "car-quarter-window-louvers": "quarter-window-louvers",
    "car-exhaust-systems-tips": "exhaust-systems-tips",
    "car-steering-wheel-covers": "steering-wheel-covers",
    "multimedia-steering-controls": "multimedia-steering-controls",
    "air-freshner-and-decoration": "air-freshener-decoration",
    "interior-light": "interior-lights",
    "sos-flasher-led-lights": "sos-flasher-led-lights",
    "led-headlights-bulbs": "led-headlights-bulbs",
    "led-indicator-lights": "led-indicator-lights",
    "carbon-fiber-car-accessories-shop-online-crazzycars-pk": "carbon-fiber-accessories",
    "car-care-cleaning-products": "car-care-cleaning",
    "car-emergency-safety-products": "emergency-safety",
    "universal-car-accessories": "universal-accessories",
}
# Collection handle -> vehicle slug (matches crazzycars-vehicles seed)
VEH_MAP = {
    "toyota-corolla-2009-2014-accessories": "toyota-corolla-e140-2009-2014",
    "toyota-corolla-e170-2014-2020-accessories": "toyota-corolla-e170-2014-2026",
    "toyota-yaris-accessories-shop-online-crazzycars-pk": "toyota-yaris-2020-present",
    "toyota-aqua-accessories-shop-online-crazzycars-pk": "toyota-aqua-2012-present",
    "toyota-vitz-accessories-shop-online-crazzycars-pk": "toyota-vitz-2012-present",
    "honda-civic-reborn-2006-2012-accessories": "honda-civic-reborn-2006-2012",
    "honda-civic-rebirth-2012-2016-accessories-body-kits": "honda-civic-rebirth-2012-2016",
    "honda-civic-x-2016-2021-accessories-body-kits": "honda-civic-x-2016-2021",
    "honda-civic-11th-gen-2022-present-accessories": "honda-civic-11th-gen-2022-present",
    "honda-city-2016-accessories-body-kits": "honda-city-classic-2009-2020",
    "honda-city": "honda-city-2021-present",
    "hyundai-elantra-2020-2024-accessories": "hyundai-elantra-2020-2024",
    "hyundai-elantra-hybrid-2025-present-accessories": "hyundai-elantra-hybrid-2025-present",
    "hyundai-sonata-2020-2024-accessories": "hyundai-sonata-2020-2024",
    "haval-h6-accessories-crazzycars-pk": "haval-h6-2021-present",
    "suzuki-alto-2020-accessories": "suzuki-alto-2020-present",
    "suzuki-swift-2025-present-accessories": "suzuki-swift-2025-present",
}
FEATURED = "features-products"
DEALS = "best-car-accessories-deals"

# Title-pattern fallback for products missing vehicle collections
INFER = [
    (r"corolla.*(e140|2008|2009|2010|2011|2012[- ]2014|2013)", ["toyota-corolla-e140-2009-2014"]),
    (r"corolla", ["toyota-corolla-e170-2014-2026"]),
    (r"yaris", ["toyota-yaris-2020-present"]),
    (r"aqua", ["toyota-aqua-2012-present"]),
    (r"vitz", ["toyota-vitz-2012-present"]),
    (r"civic.*(reborn|2006|2007)", ["honda-civic-reborn-2006-2012"]),
    (r"civic.*(rebirth|2012[- ]201[3-6])", ["honda-civic-rebirth-2012-2016"]),
    (r"civic.*(x |x-|2016|2017)", ["honda-civic-x-2016-2021"]),
    (r"civic.*(11th|2022)", ["honda-civic-11th-gen-2022-present"]),
    (r"city.*(2008|2009|2010|2012|2015|2016)", ["honda-city-classic-2009-2020"]),
    (r"city.*(2020|2021|2022|new model)", ["honda-city-2021-present"]),
    (r"elantra.*hybrid", ["hyundai-elantra-hybrid-2025-present"]),
    (r"elantra", ["hyundai-elantra-2020-2024"]),
    (r"sonata", ["hyundai-sonata-2020-2024"]),
    (r"haval|h6", ["haval-h6-2021-present"]),
    (r"alto", ["suzuki-alto-2020-present"]),
    (r"swift", ["suzuki-swift-2025-present"]),
]

def clean_title(t):
    t = re.sub(r"\s*[|–-]\s*Crazz?y ?Cars(\.pk)?\s*$", "", str(t), flags=re.I).strip()
    return t

def strip_html(s, limit=300):
    txt = re.sub(r"<[^>]+>", " ", str(s or ""))
    txt = html.unescape(re.sub(r"\s+", " ", txt)).strip()
    return txt[:limit]

def make_meta(title, seo_t, seo_d, body, tags):
    mt = seo_t if isinstance(seo_t, str) and seo_t.strip() else f"{title} | CrazzyCars.pk"
    if len(mt) > 70: mt = mt[:67].rstrip() + "..."
    if isinstance(seo_d, str) and seo_d.strip():
        md = seo_d.strip()
    else:
        base = strip_html(body, 110)
        md = f"{base} Price in Pakistan. Cash on Delivery nationwide at CrazzyCars.pk." if base else \
             f"Buy {title} online in Pakistan at the best price. Cash on Delivery nationwide at CrazzyCars.pk."
    if len(md) > 158: md = md[:155].rstrip() + "..."
    return mt, md

members = json.load(open(MEMBERS))
# invert: product handle -> set of collection handles
by_product = {}
for coll, handles in members.items():
    for h in handles:
        by_product.setdefault(h, set()).add(coll)

df = pd.read_csv(CSV)
products, warnings = [], []

for handle, g in df.groupby("Handle", sort=False):
    first = g.iloc[0]
    if pd.isna(first["Title"]):
        warnings.append(f"SKIP (no title row): {handle}")
        continue

    colls = by_product.get(handle, set())
    cats = sorted({CAT_MAP[c] for c in colls if c in CAT_MAP})
    vehs = sorted({VEH_MAP[c] for c in colls if c in VEH_MAP})
    is_universal = "universal-car-accessories" in colls

    title = clean_title(first["Title"])
    if not vehs and not is_universal:
        low = handle.lower()
        for pat, v in INFER:
            if re.search(pat, low):
                vehs = v; warnings.append(f"INFERRED vehicle {v[0]} <- {handle}"); break
        if not vehs:
            is_universal = True
            warnings.append(f"DEFAULT universal (no vehicle match): {handle}")
    if not cats:
        # Shopify gap: product only in car collections. Infer category from name.
        low = (handle + " " + title).lower()
        CAT_INFER = [
            (r"body.?kit|bumper replacement|front bumper|grille|front.?rear body", "body-kits-extensions"),
            (r"splitter|canard|side skirt|diffuser", "splitters-side-skirts"),
            (r"spoiler|ducktail", "spoilers-diffusers"),
            (r"louver", "quarter-window-louvers"),
            (r"mirror cover", "side-mirror-covers"),
            (r"sequential|indicator|reflector|tail light|rear lamp", "led-indicator-lights"),
            (r"ambient|led ac vent|interior light", "interior-lights"),
            (r"multimedia steering|steering wheel audio|control buttons", "multimedia-steering-controls"),
            (r"carbon|paddle shifter|gear knob|gear shift|trim|panel|hand brake|monogram", "carbon-fiber-accessories"),
            (r"exhaust", "exhaust-systems-tips"),
            (r"deal", "body-kits-extensions"),
        ]
        for pat, slug in CAT_INFER:
            if re.search(pat, low):
                cats = [slug]
                warnings.append(f"INFERRED category {slug} <- {handle}")
                break
        if not cats:
            warnings.append(f"NO CATEGORY (left uncategorized, fix in admin): {handle}")

    # images: rows with Image Src, ordered by position
    imgs = g[g["Image Src"].notna()][["Image Src", "Image Position", "Image Alt Text"]] \
        .drop_duplicates("Image Src").sort_values("Image Position")
    images = [{"url": r["Image Src"], "alt": (r["Image Alt Text"] if isinstance(r["Image Alt Text"], str) else title)}
              for _, r in imgs.iterrows()]

    # variants: rows with a price
    vrows = g[g["Variant Price"].notna()]
    variants = []
    for _, r in vrows.iterrows():
        v = {
            "optionName": r["Option1 Name"] if isinstance(r["Option1 Name"], str) else None,
            "optionValue": r["Option1 Value"] if isinstance(r["Option1 Value"], str) else None,
            "price": float(r["Variant Price"]),
            "compareAtPrice": float(r["Variant Compare At Price"]) if pd.notna(r["Variant Compare At Price"]) else None,
            "sku": r["Variant SKU"] if isinstance(r["Variant SKU"], str) else "",
            "image": r["Variant Image"] if isinstance(r.get("Variant Image"), str) else None,
        }
        variants.append(v)
    if not variants:
        warnings.append(f"SKIP (no priced variant): {handle}")
        continue
    base = variants[0]

    mt, md = make_meta(title, first.get("SEO Title"), first.get("SEO Description"), first["Body (HTML)"], first.get("Tags"))
    status = str(first["Status"]).lower()

    products.append({
        "name": title,
        "slug": handle,
        "descriptionHtml": first["Body (HTML)"] if isinstance(first["Body (HTML)"], str) else "",
        "shortDescription": (first.get("short description (product.metafields.custom.short_description)")
                             if isinstance(first.get("short description (product.metafields.custom.short_description)"), str) else strip_html(first["Body (HTML)"], 160)),
        "price": base["price"],
        "compareAtPrice": base["compareAtPrice"],
        "currency": "PKR",
        "images": images,
        "variants": variants if len(variants) > 1 or variants[0]["optionValue"] not in (None, "Default Title") else [],
        "tags": [t.strip() for t in str(first["Tags"]).split(",")] if isinstance(first["Tags"], str) else [],
        "vendor": first["Vendor"] if isinstance(first["Vendor"], str) else "CrazzyCars.pk",
        "categorySlugs": cats,
        "vehicleSlugs": vehs,
        "isUniversal": is_universal,
        "isFeatured": FEATURED in colls,
        "isDeal": DEALS in colls,
        "metaTitle": mt,
        "metaDescription": md,
        "isActive": status == "active",
        "status": status,
    })

json.dump(products, open(OUT, "w"), indent=1)
print(f"Products written: {len(products)}")
print(f"Active: {sum(p['isActive'] for p in products)} | Featured: {sum(p['isFeatured'] for p in products)} | Deals: {sum(p['isDeal'] for p in products)} | Universal: {sum(p['isUniversal'] for p in products)}")
print(f"With categories: {sum(1 for p in products if p['categorySlugs'])} | With vehicles: {sum(1 for p in products if p['vehicleSlugs'])}")
print(f"Multi-variant: {sum(1 for p in products if p['variants'])}")
print(f"Total images: {sum(len(p['images']) for p in products)}")
print("\n--- Warnings ---")
for w in warnings: print(" ", w)
