/**
 * Restore landscape hero banners (desktop 1600x480 / mobile 828x248 webp)
 * and fill empty car-catalog brand images. Fixes "missing" homepage banners
 * caused by portrait Cloudinary assets + multi‑MB PNGs.
 */
const { MongoClient } = require("/app/node_modules/mongodb");
const fs = require("fs");
const path = require("path");
const sharp = require("/app/node_modules/sharp");

const MEDIA = "/app/media";
const CB = "v=hero" + Date.now().toString(36);

const HEROES = [
  {
    match: /hero banner$/i,
    sort: 0,
    deskSrc: "banners/hero-1-first.webp",
    mobSrc: "banners/hero-1-first-mobile.webp",
    deskOut: "banners/crazzycars-pk-hero-1-premium-accessories-desktop.webp",
    mobOut: "banners/crazzycars-pk-hero-1-premium-accessories-mobile.webp",
    alt: "CrazzyCars.pk premium car accessories and body kits in Pakistan",
    imageName: "crazzycars-pk-hero-1-premium-accessories-desktop",
    mobileName: "crazzycars-pk-hero-1-premium-accessories-mobile",
  },
  {
    match: /hero banner 2/i,
    sort: 1,
    deskSrc: "banners/hero-3-bodykit.webp",
    mobSrc: "banners/hero-3-bodykit-mobile.webp",
    deskOut: "banners/crazzycars-pk-hero-2-body-kits-carbon-desktop.webp",
    mobOut: "banners/crazzycars-pk-hero-2-body-kits-carbon-mobile.webp",
    alt: "Car body kits and carbon fiber styling – CrazzyCars.pk Pakistan",
    imageName: "crazzycars-pk-hero-2-body-kits-carbon-desktop",
    mobileName: "crazzycars-pk-hero-2-body-kits-carbon-mobile",
  },
  {
    match: /interior/i,
    sort: 2,
    deskSrc: "banners/hero-2-civic-x.webp",
    mobSrc: "banners/hero-2-civic-x-mobile.webp",
    deskOut: "banners/crazzycars-pk-hero-3-civic-interior-desktop.webp",
    mobOut: "banners/crazzycars-pk-hero-3-civic-interior-mobile.webp",
    alt: "Honda Civic interior carbon and ambient lighting – CrazzyCars.pk",
    imageName: "crazzycars-pk-hero-3-civic-interior-desktop",
    mobileName: "crazzycars-pk-hero-3-civic-interior-mobile",
  },
  {
    match: /^banner$/i,
    sort: 3,
    deskSrc: "banners/hero-4-led.webp",
    mobSrc: "banners/hero-4-led-mobile.webp",
    deskOut: "banners/crazzycars-pk-hero-4-led-lighting-desktop.webp",
    mobOut: "banners/crazzycars-pk-hero-4-led-lighting-mobile.webp",
    alt: "LED headlights fog lights and car lighting – CrazzyCars.pk Pakistan",
    imageName: "crazzycars-pk-hero-4-led-lighting-desktop",
    mobileName: "crazzycars-pk-hero-4-led-lighting-mobile",
  },
];

async function ensureWebpCopy(srcRel, outRel, { width, height }) {
  const src = path.join(MEDIA, srcRel);
  const out = path.join(MEDIA, outRel);
  if (!fs.existsSync(src)) throw new Error("missing " + src);
  await sharp(src)
    .rotate()
    .resize(width, height, { fit: "cover", position: "centre" })
    .webp({ quality: 82, effort: 4 })
    .toFile(out);
  return out;
}

function pub(rel) {
  return `https://crazzycars.pk/media/${rel}?${CB}`;
}

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  const banners = await db.collection("banners").find({}).sort({ sortOrder: 1 }).toArray();
  const report = { banners: [], catalogs: 0 };

  for (let i = 0; i < Math.min(banners.length, HEROES.length); i += 1) {
    const b = banners[i];
    const h = HEROES.find((x) => x.sort === (b.sortOrder ?? i)) || HEROES[i];
    await ensureWebpCopy(h.deskSrc, h.deskOut, { width: 1920, height: 576 });
    await ensureWebpCopy(h.mobSrc, h.mobOut, { width: 828, height: 248 });
    const deskUrl = pub(h.deskOut);
    const mobUrl = pub(h.mobOut);
    await db.collection("banners").updateOne(
      { _id: b._id },
      {
        $set: {
          "background.type": "image",
          "background.image.url": deskUrl,
          "background.image.publicId": `local:${h.deskOut}`,
          "background.image.imageName": h.imageName,
          "background.image.altText": h.alt,
          "background.mobileImage.url": mobUrl,
          "background.mobileImage.publicId": `local:${h.mobOut}`,
          "background.mobileImage.imageName": h.mobileName,
          "background.mobileImage.altText": h.alt,
          "imageDisplay.objectFit": "cover",
          "imageDisplay.height": "large",
          status: "active",
          updatedAt: new Date(),
        },
      }
    );
    report.banners.push({
      name: b.name,
      desk: h.deskOut,
      mob: h.mobOut,
      deskKB: Math.round(fs.statSync(path.join(MEDIA, h.deskOut)).size / 1024),
      mobKB: Math.round(fs.statSync(path.join(MEDIA, h.mobOut)).size / 1024),
    });
  }

  // Fill empty car catalogs from vehicles of same brand
  const catalogs = await db.collection("carcatalogs").find({}).toArray();
  for (const cat of catalogs) {
    const has = cat.image?.url;
    if (has) continue;
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
    report.catalogs += 1;
  }

  console.log(JSON.stringify(report, null, 2));
  await client.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
