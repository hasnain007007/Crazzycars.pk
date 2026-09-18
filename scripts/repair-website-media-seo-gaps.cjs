/**
 * Repair pass: failed blogs + remaining vehicles without images.
 */
const { MongoClient } = require("/app/node_modules/mongodb");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const MEDIA = "/app/media";
const ORIGIN = "https://crazzycars.pk";
const INV = "/tmp/cloudinary-full-inventory.json";
const CB = `v=${Date.now().toString(36)}`;

function hash(s) {
  return crypto.createHash("sha1").update(String(s)).digest("hex").slice(0, 10);
}
function pub(rel) {
  return `${ORIGIN}/media/${rel}?${CB}`;
}
async function dl(url, abs) {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const res = await fetch(url, {
    headers: { "User-Agent": "CrazzyCarsRepair/1.0" },
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 400) throw new Error("tiny");
  fs.writeFileSync(abs, buf);
  return buf.length;
}

(async () => {
  const inv = JSON.parse(fs.readFileSync(INV, "utf8"));
  const products = (inv.resources || []).filter((r) => /\/products\//.test(r.public_id));
  const cars = (inv.resources || []).filter((r) => /\/cars\//.test(r.public_id));
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  const out = { blogs: [], vehicles: 0 };

  // Fix blogs whose featured still points at missing uploads OR not under /media/blogs/
  const blogs = await db.collection("blogposts").find({}).toArray();
  for (const b of blogs) {
    const url = b.featuredImage?.url || "";
    const slug = b.slug;
    const needs =
      !url ||
      /\/media\/uploads\//.test(url) ||
      !/\/media\/blogs\//.test(url);
    if (!needs) continue;

    const tokens = String(slug)
      .split("-")
      .filter((t) => t.length > 3 && !/^(guide|pakistan|best|how|what|with|from|buyer|complete)$/.test(t));
    let chosen = null;
    let best = 0;
    for (const r of products) {
      const n = r.public_id.toLowerCase();
      let sc = 0;
      for (const t of tokens) if (n.includes(t)) sc += 1;
      if (sc > best) {
        best = sc;
        chosen = r;
      }
    }
    // fallback: any wide-ish product
    if (!chosen || best < 2) {
      chosen = products.find((r) => /corolla|civic|spoiler|carbon|led/i.test(r.public_id)) || products[0];
    }
    if (!chosen) continue;
    const ext = (chosen.format || "webp").toLowerCase();
    const rel = `blogs/crazzycars-pk-blog-${slug}-${hash(chosen.public_id)}.${ext}`.slice(0, 140);
    await dl(chosen.secure_url, path.join(MEDIA, rel));
    await db.collection("blogposts").updateOne(
      { _id: b._id },
      {
        $set: {
          featuredImage: {
            url: pub(rel),
            publicId: chosen.public_id,
            altText: `${b.title} | CrazzyCars.pk Blog`,
            imageName: `crazzycars-pk-blog-${slug}`.slice(0, 100),
          },
          updatedAt: new Date(),
        },
      }
    );
    out.blogs.push(slug);
  }

  // Remaining vehicles without image
  const vehicles = await db
    .collection("vehicles")
    .find({
      $or: [{ image: { $exists: false } }, { "image.url": { $in: [null, ""] } }],
    })
    .toArray();

  for (const v of vehicles) {
    const slug = String(v.slug || "").toLowerCase();
    const name = v.name || slug;
    let chosen =
      cars.find((r) => {
        const leaf = r.public_id.split("/").pop().toLowerCase();
        const base = leaf.replace(/-[0-9a-f]{8,}$/i, "");
        return slug.startsWith(base) || base.startsWith(slug) || leaf.includes(slug.slice(0, 20));
      }) || null;

    if (!chosen) {
      const toks = slug.split("-").filter((t) => t.length > 3 && !/^\d+$/.test(t)).slice(0, 5);
      let best = 0;
      for (const r of products) {
        const n = r.public_id.toLowerCase();
        let sc = 0;
        for (const t of toks) if (n.includes(t)) sc += 1;
        if (sc > best && sc >= 2) {
          best = sc;
          chosen = r;
        }
      }
    }
    if (!chosen) continue;
    const ext = (chosen.format || "webp").toLowerCase();
    const rel = `vehicles/${slug}-${hash(chosen.public_id)}.${ext}`;
    await dl(chosen.secure_url, path.join(MEDIA, rel));
    const image = {
      url: pub(rel),
      publicId: chosen.public_id,
      altText: `${name} accessories Pakistan | Shop by car – CrazzyCars.pk`,
      imageName: `crazzycars-pk-${slug}`,
      title: `${name} Accessories Pakistan`,
    };
    await db.collection("vehicles").updateOne(
      { _id: v._id },
      {
        $set: {
          image,
          thumbnail: image.url,
          "media.images": [{ ...image, isMain: true }],
          updatedAt: new Date(),
        },
      }
    );
    out.vehicles += 1;
  }

  // Re-link car catalogs after vehicles filled
  const catalogs = await db.collection("carcatalogs").find({}).toArray();
  let cats = 0;
  for (const cat of catalogs) {
    const brand = String(cat.slug || cat.name || "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)[0];
    const veh = await db.collection("vehicles").findOne({
      slug: { $regex: `^${brand}` },
      "image.url": { $exists: true, $ne: "" },
    });
    if (!veh?.image?.url) continue;
    await db.collection("carcatalogs").updateOne(
      { _id: cat._id },
      {
        $set: {
          image: {
            url: veh.image.url,
            publicId: veh.image.publicId || "",
            altText: `${cat.name || brand} car accessories Pakistan | CrazzyCars.pk`,
            imageName: `crazzycars-pk-brand-${brand}`,
          },
          updatedAt: new Date(),
        },
      }
    );
    cats += 1;
  }
  out.carcatalogs = cats;

  // Ensure favicon also in /app/media/favicon.ico-ish path used by some layouts
  const settings = await db.collection("settings").findOne({});
  const favUrl = settings?.general?.favicon?.url || settings?.general?.faviconUrl || "";
  console.log(JSON.stringify({ ...out, favUrl: favUrl.slice(0, 100), vehiclesLeft: vehicles.length - out.vehicles }, null, 2));
  await client.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
