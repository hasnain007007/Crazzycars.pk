const { MongoClient } = require("/app/node_modules/mongodb");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

async function dl(url, rel) {
  const abs = path.join("/app/media", rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const res = await fetch(url, {
    headers: { "User-Agent": "CrazzyCarsFix/1.0" },
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(String(res.status));
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(abs, buf);
  return { url: "https://crazzycars.pk/media/" + rel, bytes: buf.length };
}

(async () => {
  const c = new MongoClient(process.env.MONGODB_URI);
  await c.connect();
  const col = c.db().collection("products");

  {
    const slug = "universal-car-digital-eyes-led-panel-lights";
    const p = await col.findOne({ slug });
    const src =
      "https://res.cloudinary.com/dquier8fv/image/upload/v1785959553/storecraft/products/universal-car-digital-eyes-led-panel-lights-1.webp";
    const hash = crypto.createHash("sha1").update(src).digest("hex").slice(0, 10);
    const rel = `products/${slug}-1-${hash}.webp`;
    const got = await dl(src, rel);
    const rest = (p.media?.images || []).filter(
      (im) => !/honda-civic-front-bumper-heart-beat/i.test(im.url || "")
    );
    const images = [
      {
        url: got.url,
        publicId: "storecraft/products/universal-car-digital-eyes-led-panel-lights-1",
        isMain: true,
        altText: `${p.name} – Buy Online Pakistan | CrazzyCars.pk`,
        imageName: path.basename(rel),
      },
      ...rest.map((im) => ({ ...im, isMain: false })),
    ];
    const seen = new Set();
    const uniq = [];
    for (const im of images) {
      if (seen.has(im.url)) continue;
      seen.add(im.url);
      uniq.push(im);
    }
    uniq[0].isMain = true;
    await col.updateOne({ _id: p._id }, { $set: { "media.images": uniq, updatedAt: new Date() } });
    console.log("digital-eyes fixed", uniq.length, uniq[0].url);
  }

  {
    const slug = "suzuki-swift-2022-2025-carbon-fiber-door-handles-cover";
    const p = await col.findOne({ slug });
    if ((p.media?.images || []).length < 2) {
      const src =
        "https://res.cloudinary.com/dquier8fv/image/upload/v1785947832/storecraft/products/suzuki-swift-2022-2025-carbon-fiber-door-handles-cover-2.webp";
      const hash = crypto.createHash("sha1").update(src).digest("hex").slice(0, 10);
      const rel = `products/${slug}-2-${hash}.webp`;
      const got = await dl(src, rel);
      const images = [...(p.media?.images || [])];
      images.push({
        url: got.url,
        publicId: "storecraft/products/suzuki-swift-2022-2025-carbon-fiber-door-handles-cover-2",
        isMain: false,
        altText: `${p.name} – Buy Online Pakistan | CrazzyCars.pk`,
        imageName: path.basename(rel),
      });
      await col.updateOne({ _id: p._id }, { $set: { "media.images": images, updatedAt: new Date() } });
      console.log("swift now", images.length);
    } else {
      console.log("swift already", p.media.images.length);
    }
  }

  const inv = JSON.parse(fs.readFileSync("/tmp/cloudinary-full-inventory.json", "utf8"));
  const catRes = (inv.resources || []).filter(
    (r) => /\/categories\//.test(r.public_id) || /^storecraft\/categories\//.test(r.public_id)
  );
  const cats = await c.db().collection("categories").find({}).toArray();
  let catFixed = 0;
  for (const cat of cats) {
    const slug = String(cat.slug || "").toLowerCase();
    const hits = catRes.filter((r) => {
      const leaf = r.public_id.split("/").pop().toLowerCase();
      const n = leaf.replace(/-\d+-[0-9a-f]{8,}$/i, "").replace(/-[0-9a-f]{8,}$/i, "");
      return n.startsWith(slug.slice(0, 24)) || slug.startsWith(n.slice(0, 24)) || leaf.includes(slug);
    });
    if (!hits.length) continue;
    const cur = cat.image?.url || cat.media?.images?.[0]?.url || "";
    if (cur && /\/media\//.test(cur)) continue;
    const hit = hits[0];
    const ext = (hit.format || "webp").toLowerCase();
    const hash = crypto.createHash("sha1").update(hit.public_id).digest("hex").slice(0, 10);
    const rel = `categories/${slug}-1-${hash}.${ext}`;
    try {
      const got = await dl(hit.secure_url, rel);
      await c.db().collection("categories").updateOne(
        { _id: cat._id },
        {
          $set: {
            image: {
              url: got.url,
              publicId: hit.public_id,
              altText: `${cat.name} car accessories Pakistan | CrazzyCars.pk`,
            },
            updatedAt: new Date(),
          },
        }
      );
      catFixed += 1;
    } catch (e) {
      console.log("cat fail", slug, e.message);
    }
  }
  console.log("categoriesUpdated", catFixed);
  await c.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
