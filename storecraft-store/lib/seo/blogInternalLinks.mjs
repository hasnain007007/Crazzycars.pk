/**
 * Code-driven internal links between blogs ↔ categories / cars / products (S11).
 * Only lists slugs that exist on the live site; no self-links.
 */

/** Priority posts from Search Console crawled-not-indexed set + keyword hubs. */
export const BLOG_LINK_CATALOG = [
  {
    slug: "body-kit-price-in-pakistan-2026",
    title: "Body Kit Price in Pakistan 2026",
    keywords: ["body kit", "body-kit", "fibreglass", "fiberglass", "bumper kit"],
    categories: ["body-kits-extensions", "exterior", "splitters-side-skirts", "spoilers-diffusers"],
    cars: [
      "honda-civic-x-2016-2021",
      "honda-civic-reborn-2006-2012",
      "honda-civic-rebirth-2012-2016",
      "honda-city-2021-present",
      "honda-city-classic-2009-2020",
      "toyota-corolla-e170-2014-2026",
      "toyota-corolla-e140-2009-2014",
      "toyota-aqua-2012-present",
      "suzuki-alto-2020-present",
      "suzuki-swift-2025-present",
      "toyota-yaris-2020-present",
    ],
  },
  {
    slug: "honda-city-2021-modification-cost-pakistan",
    title: "Honda City 2021 Modification Cost in Pakistan",
    keywords: ["honda city", "city 2021", "city modification"],
    categories: ["body-kits-extensions", "spoilers-diffusers", "side-mirror-covers"],
    cars: ["honda-city-2021-present", "honda-city-classic-2009-2020"],
  },
  {
    slug: "7d-vs-9d-vs-tpe-floor-mats-pakistan",
    title: "7D vs 9D vs TPE Floor Mats in Pakistan",
    keywords: ["floor mat", "floor mats", "tpe", "7d", "9d"],
    categories: ["floor-mats", "interior"],
    cars: [],
  },
  {
    slug: "honda-civic-accessories-guide-every-generation",
    title: "Honda Civic Accessories Guide — Every Generation",
    keywords: ["civic", "reborn", "rebirth", "civic x"],
    categories: ["exterior", "carbon-fiber", "body-kits-extensions"],
    cars: [
      "honda-civic-x-2016-2021",
      "honda-civic-reborn-2006-2012",
      "honda-civic-rebirth-2012-2016",
      "honda-civic-11th-gen-2022-present",
    ],
  },
  {
    slug: "side-mirror-covers-carbon-fiber-accents-guide",
    title: "Side Mirror Covers & Carbon Fiber Accents Guide",
    keywords: ["side mirror", "mirror cover", "batman", "carbon"],
    categories: ["side-mirror-covers", "carbon-fiber", "exterior"],
    cars: [],
  },
  {
    slug: "led-ambient-lighting-car-buyer-guide",
    title: "LED Ambient Lighting Buyer Guide",
    keywords: ["led", "ambient", "interior light", "indicator"],
    categories: ["led-lighting", "interior-lights", "led-indicator-lights", "led-headlights-bulbs"],
    cars: [],
  },
  {
    slug: "best-body-kit-styles-toyota-corolla-pakistan",
    title: "Best Body Kit Styles for Toyota Corolla",
    keywords: ["corolla", "e140", "e170", "body kit"],
    categories: ["body-kits-extensions", "exterior"],
    cars: ["toyota-corolla-e170-2014-2026", "toyota-corolla-e140-2009-2014"],
  },
  {
    slug: "toyota-yaris-vs-honda-city-best-accessories",
    title: "Toyota Yaris vs Honda City — Best Accessories",
    keywords: ["yaris", "honda city", "city"],
    categories: ["exterior", "floor-mats"],
    cars: ["toyota-yaris-2020-present", "honda-city-2021-present", "honda-city-classic-2009-2020"],
  },
  {
    slug: "car-perfume-air-freshener-guide",
    title: "Car Perfume & Air Freshener Guide",
    keywords: ["perfume", "air freshener", "fragrance"],
    categories: ["air-freshener-decoration", "interior"],
    cars: [],
  },
  {
    slug: "car-care-101-essential-products-pakistan",
    title: "Car Care 101 — Essential Products in Pakistan",
    keywords: ["car care", "polish", "wash", "detail"],
    categories: ["interior", "exterior"],
    cars: [],
  },
  {
    slug: "protect-car-interior-from-pakistan-heat",
    title: "Protect Car Interior from Pakistan Heat",
    keywords: ["heat", "sun shade", "dashboard", "interior"],
    categories: ["sun-shades", "interior", "floor-mats"],
    cars: [],
  },
  {
    slug: "are-aftermarket-car-accessories-safe",
    title: "Are Aftermarket Car Accessories Safe?",
    keywords: ["aftermarket", "safe", "quality"],
    categories: ["exterior", "universal-accessories", "car-care-safety"],
    cars: [],
  },
  {
    slug: "best-floor-mats-pakistani-weather-guide",
    title: "Best Floor Mats for Pakistani Weather",
    keywords: ["floor mat", "weather", "mud", "rain"],
    categories: ["floor-mats", "interior"],
    cars: [],
  },
  {
    slug: "cod-vs-online-payment-car-accessories-pakistan",
    title: "COD vs Online Payment for Car Accessories",
    keywords: ["cod", "payment", "online payment"],
    categories: ["exterior", "interior", "universal-accessories"],
    cars: [],
  },
  {
    slug: "dash-cameras-pakistan-why-every-driver-needs-one",
    title: "Dash Cameras in Pakistan — Why Every Driver Needs One",
    keywords: ["dash cam", "camera", "gadget"],
    categories: ["gadgets", "car-care-safety", "utility"],
    cars: [],
  },
  {
    slug: "exhaust-tips-systems-sound-performance",
    title: "Exhaust Tips & Systems — Sound and Performance",
    keywords: ["exhaust", "muffler", "tip"],
    categories: ["exhaust-systems-tips", "exterior"],
    cars: [],
  },
  {
    slug: "how-to-choose-right-front-grille",
    title: "How to Choose the Right Front Grille",
    keywords: ["grille", "front grille"],
    categories: ["front-grilles", "exterior"],
    cars: [],
  },
  {
    slug: "seat-covers-buying-guide-pakistan-climate",
    title: "Seat Covers Buying Guide for Pakistan Climate",
    keywords: ["seat cover", "seats", "climate"],
    categories: ["interior", "steering-wheel-covers"],
    cars: [],
  },
];

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function uniqLinks(rows, limit = 5) {
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const href = String(r?.href || "").trim();
    if (!href.startsWith("/") || seen.has(href)) continue;
    seen.add(href);
    out.push({ href, title: String(r.title || href).trim() });
    if (out.length >= limit) break;
  }
  return out;
}

/** Related guides for a blog post (other blogs + matching cats/cars). */
export function relatedGuidesForBlog(post) {
  const slug = String(post?.slug || "").trim();
  const hay = norm(
    [post?.title, post?.excerpt, ...(post?.categories || []), ...(post?.tags || []), slug].join(" ")
  );
  const blogs = [];
  const hubs = [];
  for (const row of BLOG_LINK_CATALOG) {
    if (row.slug === slug) {
      for (const c of row.categories || []) hubs.push({ href: `/categories/${c}`, title: categoryLabel(c) });
      for (const c of row.cars || []) hubs.push({ href: `/cars/${c}`, title: carLabel(c) });
      continue;
    }
    const hit =
      row.keywords.some((k) => hay.includes(norm(k))) ||
      (row.categories || []).some((c) => (post?.categories || []).map(norm).includes(norm(c)));
    if (hit) blogs.push({ href: `/blogs/${row.slug}`, title: row.title });
  }
  // Always prefer sibling priority posts when thin.
  for (const row of BLOG_LINK_CATALOG.slice(0, 3)) {
    if (row.slug !== slug) blogs.push({ href: `/blogs/${row.slug}`, title: row.title });
  }
  return uniqLinks([...blogs, ...hubs], 5);
}

/** "From the blog" on category pages. */
export function blogsForCategory(categorySlug, categoryName = "") {
  const slug = String(categorySlug || "").trim();
  const hay = norm(`${slug} ${categoryName}`);
  const rows = [];
  for (const row of BLOG_LINK_CATALOG) {
    if ((row.categories || []).includes(slug)) {
      rows.push({ href: `/blogs/${row.slug}`, title: row.title });
      continue;
    }
    if (row.keywords.some((k) => hay.includes(norm(k)))) {
      rows.push({ href: `/blogs/${row.slug}`, title: row.title });
    }
  }
  return uniqLinks(rows, 5);
}

/** "From the blog" on car pages. */
export function blogsForCar(carSlug, displayName = "") {
  const slug = String(carSlug || "").trim();
  const hay = norm(`${slug} ${displayName}`);
  const rows = [];
  for (const row of BLOG_LINK_CATALOG) {
    if ((row.cars || []).includes(slug)) {
      rows.push({ href: `/blogs/${row.slug}`, title: row.title });
      continue;
    }
    if (row.keywords.some((k) => hay.includes(norm(k)))) {
      rows.push({ href: `/blogs/${row.slug}`, title: row.title });
    }
  }
  return uniqLinks(rows, 5);
}

/** "From the blog" on product pages — match name + category slugs. */
export function blogsForProduct({ name = "", categorySlugs = [], carSlugs = [] } = {}) {
  const hay = norm([name, ...categorySlugs, ...carSlugs].join(" "));
  const rows = [];
  for (const row of BLOG_LINK_CATALOG) {
    if ((row.categories || []).some((c) => categorySlugs.includes(c))) {
      rows.push({ href: `/blogs/${row.slug}`, title: row.title });
      continue;
    }
    if ((row.cars || []).some((c) => carSlugs.includes(c))) {
      rows.push({ href: `/blogs/${row.slug}`, title: row.title });
      continue;
    }
    if (row.keywords.some((k) => hay.includes(norm(k)))) {
      rows.push({ href: `/blogs/${row.slug}`, title: row.title });
    }
  }
  return uniqLinks(rows, 5);
}

function categoryLabel(slug) {
  return String(slug || "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function carLabel(slug) {
  return categoryLabel(slug);
}

/** All blog→target hrefs for C24 inbound counting (targets that should link back). */
export function expectedInboundTargetsByBlogSlug() {
  const map = new Map();
  for (const row of BLOG_LINK_CATALOG) {
    const sources = new Set();
    for (const c of row.categories || []) sources.add(`/categories/${c}`);
    for (const c of row.cars || []) sources.add(`/cars/${c}`);
    // Related guides on other blogs also count — approximate via keyword peers
    for (const peer of BLOG_LINK_CATALOG) {
      if (peer.slug === row.slug) continue;
      const shared =
        (peer.categories || []).some((c) => (row.categories || []).includes(c)) ||
        (peer.cars || []).some((c) => (row.cars || []).includes(c)) ||
        peer.keywords.some((k) => row.keywords.some((rk) => norm(k) === norm(rk)));
      if (shared) sources.add(`/blogs/${peer.slug}`);
    }
    map.set(row.slug, [...sources]);
  }
  return map;
}
