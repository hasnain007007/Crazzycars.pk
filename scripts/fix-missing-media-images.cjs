const { MongoClient } = require("/app/node_modules/mongodb");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const sharp = require("/app/node_modules/sharp");

const MEDIA = "/app/media";
const CB = "v=" + Date.now().toString(36);
const inv = JSON.parse(fs.readFileSync("/tmp/cloudinary-full-inventory.json", "utf8"));
const catRes = (inv.resources || []).filter((r) => /\/categories\//.test(r.public_id));
const prodRes = (inv.resources || []).filter((r) => /\/products\//.test(r.public_id));
const hash = (s) => crypto.createHash("sha1").update(String(s)).digest("hex").slice(0, 10);

async function dl(url, abs) {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const res = await fetch(url, {
    headers: { "User-Agent": "CCThumbFix/1.0" },
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) throw new Error(String(res.status));
  fs.writeFileSync(abs, Buffer.from(await res.arrayBuffer()));
}

async function make400(abs) {
  const out = abs.replace(/\.(webp|jpe?g|png|gif|avif)$/i, "-400.webp");
  await sharp(abs)
    .rotate()
    .resize(400, 400, { fit: "cover", position: "centre" })
    .webp({ quality: 72 })
    .toFile(out);
}

function score(slug, pid) {
  const s = String(slug).toLowerCase();
  const n = pid
    .split("/")
    .pop()
    .toLowerCase()
    .replace(/-\d+-[0-9a-f]{8,}$/i, "")
    .replace(/-[0-9a-f]{8,}$/i, "");
  if (s === n) return 100;
  if (n.startsWith(s) || s.startsWith(n)) return 80;
  const toks = s.split("-").filter((t) => t.length > 2);
  let hit = 0;
  for (const t of toks) if (n.includes(t)) hit += 1;
  return hit >= 2 ? 50 + hit : 0;
}

(async () => {
  const c = new MongoClient(process.env.MONGODB_URI);
  await c.connect();
  const db = c.db();
  let catsFixed = 0;
  const cats = await db.collection("categories").find({}).toArray();
  for (const cat of cats) {
    const url = cat.image?.url || "";
    const m = url.match(/\/media\/([^?]+)/);
    const abs = m ? path.join(MEDIA, decodeURIComponent(m[1])) : "";
    const missing = !url || !abs || !fs.existsSync(abs) || fs.statSync(abs).size < 800;
    if (!missing) {
      // ensure -400 exists
      if (abs && fs.existsSync(abs)) {
        const thumb = abs.replace(/\.(webp|jpe?g|png|gif|avif)$/i, "-400.webp");
        if (!fs.existsSync(thumb) || fs.statSync(thumb).size < 400) {
          try {
            await make400(abs);
          } catch (_) {}
        }
      }
      continue;
    }
    const hits = catRes
      .map((r) => ({ r, sc: score(cat.slug, r.public_id) }))
      .filter((x) => x.sc >= 50)
      .sort((a, b) => b.sc - a.sc);
    let chosen = hits[0]?.r;
    if (!chosen) {
      const ph = prodRes
        .map((r) => ({ r, sc: score(cat.slug, r.public_id) }))
        .filter((x) => x.sc >= 50)
        .sort((a, b) => b.sc - a.sc);
      chosen = ph[0]?.r;
    }
    if (!chosen) {
      const ext = ["/app/media/categories/exterior-b79e732c25.webp", "/app/media/categories/led-lighting-95eeeb16cc.webp"].find(
        (p) => fs.existsSync(p)
      );
      if (!ext) continue;
      const rel = `categories/${cat.slug}-${hash(cat.slug)}.webp`;
      fs.copyFileSync(ext, path.join(MEDIA, rel));
      await make400(path.join(MEDIA, rel));
      await db.collection("categories").updateOne(
        { _id: cat._id },
        {
          $set: {
            "image.url": `https://crazzycars.pk/media/${rel}?${CB}`,
            "image.altText": `${cat.name} car accessories Pakistan | CrazzyCars.pk`,
            "image.imageName": `crazzycars-pk-category-${cat.slug}`,
            updatedAt: new Date(),
          },
        }
      );
      catsFixed += 1;
      continue;
    }
    const extn = (chosen.format || "webp").toLowerCase();
    const rel = `categories/${cat.slug}-${hash(chosen.public_id)}.${extn}`;
    await dl(chosen.secure_url, path.join(MEDIA, rel));
    await make400(path.join(MEDIA, rel));
    await db.collection("categories").updateOne(
      { _id: cat._id },
      {
        $set: {
          "image.url": `https://crazzycars.pk/media/${rel}?${CB}`,
          "image.publicId": chosen.public_id,
          "image.altText": `${cat.name} car accessories Pakistan | CrazzyCars.pk`,
          "image.imageName": `crazzycars-pk-category-${cat.slug}`,
          updatedAt: new Date(),
        },
      }
    );
    catsFixed += 1;
  }

  const badSlugs = [
    "universal-car-eyes-spoiler-with-running-brake-led-lights-3pcs",
    "honda-civic-type-r-side-markers-fender-indicator-lights-2016-2021",
    "toyota-corolla-nike-style-3-projector-headlights-2012-2014",
    "toyota-corolla-lava-style-tail-lights-2012-2014",
    "toyota-mark-x-duck-tail-spoiler-2004-2009",
  ];
  let prodsFixed = 0;
  for (const slug of badSlugs) {
    const p = await db.collection("products").findOne({ slug });
    if (!p) {
      console.log("missing product", slug);
      continue;
    }
    const hits = prodRes
      .map((r) => ({ r, sc: score(slug, r.public_id) }))
      .filter((x) => x.sc >= 55)
      .sort((a, b) => b.sc - a.sc);
    if (!hits.length) {
      console.log("no cld match", slug);
      continue;
    }
    const imgs = [];
    for (let i = 0; i < Math.min(4, hits.length); i += 1) {
      const hit = hits[i].r;
      const extn = (hit.format || "webp").toLowerCase();
      const rel = `products/${slug}-${i + 1}-${hash(hit.public_id)}.${extn}`;
      await dl(hit.secure_url, path.join(MEDIA, rel));
      await make400(path.join(MEDIA, rel));
      imgs.push({
        url: `https://crazzycars.pk/media/${rel}`,
        publicId: hit.public_id,
        isMain: i === 0,
        altText: `${p.name} – Buy Online Pakistan | CrazzyCars.pk`,
        imageName: `crazzycars-pk-${slug}-${i + 1}`,
      });
    }
    await db.collection("products").updateOne(
      { _id: p._id },
      { $set: { "media.images": imgs, updatedAt: new Date() } }
    );
    prodsFixed += 1;
    console.log("product fixed", slug, imgs.length);
  }

  // Count remaining category/product thumbs missing
  let catMissingThumb = 0;
  for (const cat of await db.collection("categories").find({}).project({ "image.url": 1 }).toArray()) {
    const url = cat.image?.url || "";
    const mm = url.match(/\/media\/([^?]+)/);
    if (!mm) continue;
    const abs = path.join(MEDIA, decodeURIComponent(mm[1]));
    const thumb = abs.replace(/\.(webp|jpe?g|png|gif|avif)$/i, "-400.webp");
    if (!fs.existsSync(thumb)) catMissingThumb += 1;
  }

  console.log(JSON.stringify({ catsFixed, prodsFixed, catMissingThumb }, null, 2));
  await c.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
