const { MongoClient } = require("/app/node_modules/mongodb");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const MEDIA = "/app/media";
const INV = JSON.parse(fs.readFileSync("/tmp/cloudinary-full-inventory.json", "utf8"));
const products = (INV.resources || []).filter((r) => /\/products\//.test(r.public_id));
const CB = `v=${Date.now().toString(36)}`;
const hash = (s) => crypto.createHash("sha1").update(String(s)).digest("hex").slice(0, 10);

async function dl(url, abs) {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const res = await fetch(url, {
    headers: { "User-Agent": "CCFix/1.0" },
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(String(res.status));
  fs.writeFileSync(abs, Buffer.from(await res.arrayBuffer()));
}

(async () => {
  const c = new MongoClient(process.env.MONGODB_URI);
  await c.connect();
  const db = c.db();
  const missing = await db
    .collection("vehicles")
    .find({ $or: [{ image: { $exists: false } }, { "image.url": { $in: [null, ""] } }] })
    .toArray();
  const withImg = await db
    .collection("vehicles")
    .find({ "image.url": { $exists: true, $ne: "" } })
    .toArray();
  let n = 0;
  const skipped = [];
  for (const v of missing) {
    const slug = String(v.slug || "").toLowerCase();
    const name = v.name || slug;
    const brand = slug.split("-")[0];
    const modelTokens = slug
      .split("-")
      .filter((t) => t.length > 2 && !/^\d+$/.test(t) && t !== "present" && t !== "gen");
    let chosen = null;
    let best = 0;
    for (const r of products) {
      const id = r.public_id.toLowerCase();
      let sc = 0;
      for (const t of modelTokens) if (id.includes(t)) sc += 2;
      if (id.includes(brand)) sc += 1;
      if (sc > best) {
        best = sc;
        chosen = r;
      }
    }
    let srcUrl = null;
    let publicId = "";
    if (chosen && best >= 3) {
      srcUrl = chosen.secure_url;
      publicId = chosen.public_id;
    } else {
      const sibling = withImg.find((x) => String(x.slug).startsWith(brand + "-"));
      if (sibling?.image?.url) {
        const relOld = sibling.image.url.replace(/^https?:\/\/[^/]+\/media\//, "").split("?")[0];
        const absOld = path.join(MEDIA, relOld);
        const ext = path.extname(absOld) || ".webp";
        const rel = `vehicles/${slug}-${hash(slug + relOld)}${ext}`;
        if (fs.existsSync(absOld)) {
          fs.copyFileSync(absOld, path.join(MEDIA, rel));
          srcUrl = `https://crazzycars.pk/media/${rel}?${CB}`;
          publicId = sibling.image.publicId || "";
        }
      }
      if (!srcUrl && chosen) {
        srcUrl = chosen.secure_url;
        publicId = chosen.public_id;
      }
    }
    if (!srcUrl) {
      skipped.push(slug);
      continue;
    }
    let finalUrl = srcUrl;
    if (/res\.cloudinary\.com/i.test(srcUrl)) {
      const ext = chosen?.format || "webp";
      const rel = `vehicles/${slug}-${hash(srcUrl)}.${ext}`;
      await dl(srcUrl, path.join(MEDIA, rel));
      finalUrl = `https://crazzycars.pk/media/${rel}?${CB}`;
    }
    const image = {
      url: finalUrl,
      publicId,
      altText: `${name} accessories Pakistan | Shop by car – CrazzyCars.pk`,
      imageName: `crazzycars-pk-${slug}`,
      title: `${name} Accessories Pakistan`,
    };
    await db.collection("vehicles").updateOne(
      { _id: v._id },
      {
        $set: {
          image,
          thumbnail: finalUrl,
          "media.images": [{ ...image, isMain: true }],
          updatedAt: new Date(),
        },
      }
    );
    n += 1;
  }
  const left = await db
    .collection("vehicles")
    .countDocuments({ $or: [{ image: { $exists: false } }, { "image.url": { $in: [null, ""] } }] });
  console.log(JSON.stringify({ filled: n, left, skipped }, null, 2));
  await c.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
