/**
 * CrazzyCars.pk catalog categories — single source of truth for footer, nav, and grids.
 * `slug` matches the intended Shopify collection handle (and /categories/[slug] route).
 */
export const CRAZZYCARS_CATEGORIES = [
  { name: "Universal Car Accessories", slug: "universal-car-accessories" },
  { name: "SOS & Flasher LED Lights", slug: "sos-flasher-led-lights" },
  { name: "Splitters & Side Skirts", slug: "splitters-side-skirts" },
  { name: "LED Headlights & Bulbs", slug: "led-headlights-bulbs" },
  { name: "Spoilers & Diffusers", slug: "spoilers-diffusers" },
  { name: "Carbon Fiber Side Mirror Covers", slug: "carbon-fiber-side-mirror-covers" },
  { name: "Care & Cleaning", slug: "care-cleaning" },
  { name: "Emergency & Safety Products", slug: "emergency-safety-products" },
  { name: "Exhaust Systems & Tips", slug: "exhaust-systems-tips" },
  { name: "Quarter Window Louvers", slug: "quarter-window-louvers" },
  { name: "LED Indicator Lights", slug: "led-indicator-lights" },
  { name: "Steering Wheel Covers", slug: "steering-wheel-covers" },
  { name: "Air Freshener & Decsheets", slug: "air-freshener-sheets" },
  { name: "Body Kits", slug: "body-kits" },
  { name: "Carbon Fiber Car Accessories", slug: "carbon-fiber-car-accessories" },
];

export function categoryHref(slug) {
  return `/categories/${slug}`;
}

export function getCategoryBySlug(slug) {
  const s = String(slug || "").trim().toLowerCase();
  return CRAZZYCARS_CATEGORIES.find((c) => c.slug === s) || null;
}

/** Mega-menu columns (nav) derived from the same list. */
export function getCategoryMegaColumns() {
  const cols = [
    { title: "Exterior", slugs: ["splitters-side-skirts", "spoilers-diffusers", "body-kits", "quarter-window-louvers", "exhaust-systems-tips"] },
    { title: "Lighting", slugs: ["sos-flasher-led-lights", "led-headlights-bulbs", "led-indicator-lights"] },
    {
      title: "Interior & Care",
      slugs: [
        "steering-wheel-covers",
        "air-freshener-sheets",
        "care-cleaning",
        "emergency-safety-products",
        "universal-car-accessories",
        "carbon-fiber-side-mirror-covers",
        "carbon-fiber-car-accessories",
      ],
    },
  ];
  return cols.map((col) => ({
    title: col.title,
    links: col.slugs
      .map((slug) => getCategoryBySlug(slug))
      .filter(Boolean)
      .map((c) => ({ label: c.name, href: categoryHref(c.slug) })),
  }));
}
