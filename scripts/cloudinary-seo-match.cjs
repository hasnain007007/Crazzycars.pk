/**
 * Match Cloudinary inventory to Mongo products for SEO backfill planning.
 * Usage in store container:
 *   node /tmp/cloudinary-seo-match.cjs
 */
const { MongoClient } = require("/app/node_modules/mongodb");
const fs = require("fs");

const inv = JSON.parse(fs.readFileSync("/tmp/cloudinary-full-inventory.json", "utf8"));
const resources = inv.resources || [];

function slugFromPid(publicId) {
  const parts = String(publicId || "").split("/");
  if (parts.includes("autoaestheticstore") && parts.includes("products")) {
    const i = parts.indexOf("products");
    if (parts[i + 1]) return parts[i + 1].toLowerCase();
  }
  if (parts[0] === "storecraft" && parts[1] === "products") {
    const leaf = parts[2] || "";
    return leaf
      .replace(/-\d+$/, "")
      .replace(/-[0-9a-f]{8,}$/i, "")
      .toLowerCase();
  }
  if (parts.includes("categories")) {
    const i = parts.indexOf("categories");
    if (parts[i + 1]) return parts[i + 1].toLowerCase().replace(/-[0-9a-f]{8,}$/i, "");
  }
  if (parts.includes("cars")) {
    const i = parts.indexOf("cars");
    if (parts[i + 1]) return parts[i + 1].toLowerCase().replace(/-[0-9a-f]{8,}$/i, "");
  }
  return null;
}

function kindFromPid(publicId) {
  if (/\/products\//.test(publicId) || /^storecraft\/products\//.test(publicId)) return "product";
  if (/\/categories\//.test(publicId) || /^storecraft\/categories\//.test(publicId)) return "category";
  if (/\/cars\//.test(publicId)) return "car";
  if (/\/blog\//.test(publicId)) return "blog";
  if (/\/banners\//.test(publicId)) return "banner";
  return "other";
}

(async () => {
  const c = new MongoClient(process.env.MONGODB_URI);
  await c.connect();
  const db = c.db();
  const products = await db
    .collection("products")
    .find({ status: "active" })
    .project({ name: 1, slug: 1, "media.images": 1, seo: 1 })
    .toArray();

  const cldBySlug = new Map();
  const cldByKind = { product: 0, category: 0, car: 0, blog: 0, banner: 0, other: 0 };
  for (const r of resources) {
    const kind = kindFromPid(r.public_id);
    cldByKind[kind] = (cldByKind[kind] || 0) + 1;
    const s = slugFromPid(r.public_id);
    if (!s) continue;
    if (!cldBySlug.has(s)) cldBySlug.set(s, []);
    cldBySlug.get(s).push({ ...r, kind });
  }

  let matched = 0;
  const unmatchedProducts = [];
  const enrich = [];
  const altFix = [];

  for (const p of products) {
    const imgs = p.media?.images || [];
    let hits = (cldBySlug.get(p.slug) || []).filter((h) => h.kind === "product" || !h.kind);
    if (!hits.length) {
      for (const [s, arr] of cldBySlug) {
        if (s === p.slug || s.startsWith(p.slug + "-") || p.slug.startsWith(s + "-")) {
          hits = arr.filter((h) => /product/.test(h.kind) || /\/products\//.test(h.public_id));
          if (hits.length) break;
        }
      }
    }
    if (hits.length) {
      matched += 1;
      if (imgs.length < Math.min(hits.length, 8)) {
        enrich.push({
          slug: p.slug,
          name: p.name,
          local: imgs.length,
          cld: hits.length,
          urls: hits
            .sort((a, b) => String(a.public_id).localeCompare(String(b.public_id)))
            .slice(0, 8)
            .map((h) => ({ public_id: h.public_id, url: h.secure_url, w: h.width, h: h.height })),
        });
      }
    } else {
      unmatchedProducts.push(p.slug);
    }

    const badAlt = imgs.filter((i) => {
      const a = String(i.altText || "").trim();
      return !a || a.length < 5 || /^(image|photo|img)\d*$/i.test(a);
    });
    if (badAlt.length) {
      altFix.push({ slug: p.slug, name: p.name, bad: badAlt.length, total: imgs.length });
    }
  }

  // Categories
  let categories = [];
  try {
    categories = await db.collection("categories").find({}).project({ name: 1, slug: 1, image: 1, media: 1 }).toArray();
  } catch (_) {}
  let cars = [];
  try {
    cars = await db.collection("cars").find({}).project({ name: 1, slug: 1, image: 1, media: 1 }).toArray();
  } catch (_) {}
  let blogs = [];
  try {
    blogs = await db
      .collection("blogposts")
      .find({})
      .project({ title: 1, slug: 1, featuredImage: 1, status: 1 })
      .toArray();
  } catch (_) {}

  const catMatch = categories.filter((cat) => (cldBySlug.get(cat.slug) || []).some((x) => x.kind === "category")).length;
  const carMatch = cars.filter((car) => (cldBySlug.get(car.slug) || []).some((x) => x.kind === "car" || /\/cars\//.test(x.public_id))).length;

  const report = {
    fetchedAt: inv.fetchedAt,
    cloud: inv.cloud,
    cldByKind,
    productsActive: products.length,
    matchedToCloudinary: matched,
    matchRate: Number(((matched / Math.max(products.length, 1)) * 100).toFixed(1)),
    unmatchedProductCount: unmatchedProducts.length,
    unmatchedProducts: unmatchedProducts.slice(0, 50),
    productsNeedingImageBackfill: enrich.length,
    backfillSample: enrich.slice(0, 25),
    productsWeakAlt: altFix.length,
    weakAltSample: altFix.slice(0, 20),
    categories: categories.length,
    categoriesMatched: catMatch,
    cars: cars.length,
    carsMatched: carMatch,
    blogs: blogs.length,
    blogsWithFeatured: blogs.filter((b) => b.featuredImage?.url).length,
    cldSlugKeys: cldBySlug.size,
  };

  fs.writeFileSync("/tmp/cloudinary-seo-match-report.json", JSON.stringify(report, null, 2));
  fs.writeFileSync("/tmp/cloudinary-seo-backfill.json", JSON.stringify(enrich, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await c.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
