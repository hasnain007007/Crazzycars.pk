/**
 * COMPLETE WEBSITE MEDIA + SEO SYNC (Cloudinary → VPS /media → Mongo)
 *
 * PLAN
 * ----
 * 1. Brand: favicon (empty today), logo, OG image — SEO filenames + alts
 * 2. Hero banners (4): refresh from Cloudinary HQ 2667×800 masters, SEO names/alts, cache-bust
 * 3. Brand story images: rehost with SEO filenames
 * 4. Vehicles (68): attach Cloudinary car shots; fuzzy product fallbacks for the rest
 * 5. Categories: SEO alt/title/imageName; upgrade from Cloudinary when larger
 * 6. Blogs (25): SEO featured filenames/alts; topic-matched product/car imagery (no adult assets)
 * 7. Products: SEO alt + imageName for every frame; gallery backfill; fix slug-mismatched mains
 * 8. Car catalogs: brand image if matchable
 *
 * Run in store container:
 *   node /tmp/complete-website-media-seo-sync.cjs           # dry-run
 *   node /tmp/complete-website-media-seo-sync.cjs --apply
 */
const { MongoClient, ObjectId } = require("/app/node_modules/mongodb");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const APPLY = process.argv.includes("--apply");
const MEDIA = process.env.MEDIA_ROOT || "/app/media";
const ORIGIN = "https://crazzycars.pk";
const INV = "/tmp/cloudinary-full-inventory.json";
const CACHE_BUST = `v=${Date.now().toString(36)}`;

const ADULT_RE =
  /(sex|toy|bdsm|anal|nipple|penis|vibrator|dildo|bondage|chastity|cock|prostate|piercing|ball.?stretch|butt.?plug|ballbust)/i;

function hash(s) {
  return crypto.createHash("sha1").update(String(s)).digest("hex").slice(0, 10);
}
function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
function publicUrl(rel) {
  return `${ORIGIN}/media/${rel.replace(/^\/+/, "")}?${CACHE_BUST}`;
}
function publicUrlClean(rel) {
  return `${ORIGIN}/media/${rel.replace(/^\/+/, "")}`;
}
function leaf(pid) {
  return String(pid || "").split("/").pop() || "";
}
function normLeaf(pid) {
  return leaf(pid)
    .replace(/\.(webp|jpe?g|png|gif)$/i, "")
    .replace(/-\d+-[0-9a-f]{8,}$/i, "")
    .replace(/-[0-9a-f]{8,}$/i, "")
    .replace(/-\d+$/i, "")
    .toLowerCase();
}
function seoProductAlt(name) {
  const n = String(name || "").trim() || "Car accessory";
  if (/crazzycars\.pk/i.test(n)) return n;
  return `${n} – Buy Online Pakistan | CrazzyCars.pk`;
}
function seoBlogAlt(title) {
  return `${String(title || "Car accessories guide").trim()} | CrazzyCars.pk Blog`;
}
function seoCatAlt(name) {
  return `${String(name || "Category").trim()} car accessories Pakistan | CrazzyCars.pk`;
}
function seoVehicleAlt(name) {
  return `${String(name || "Car").trim()} accessories Pakistan | Shop by car – CrazzyCars.pk`;
}

async function download(url, relAbs) {
  fs.mkdirSync(path.dirname(relAbs), { recursive: true });
  const res = await fetch(url, {
    headers: { "User-Agent": "CrazzyCarsCompleteMediaSEO/1.0" },
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 400) throw new Error("tiny");
  fs.writeFileSync(relAbs, buf);
  return buf.length;
}

function scoreSlug(slug, publicId) {
  const s = String(slug || "").toLowerCase();
  const n = normLeaf(publicId);
  if (!s || !n) return 0;
  if (s === n) return 100;
  if (s.startsWith(n) && n.length >= 16) return 92;
  if (n.startsWith(s) && s.length >= 16) return 90;
  const pref = s.slice(0, Math.min(40, s.length));
  if (n.startsWith(pref) || pref.startsWith(n.slice(0, Math.min(40, n.length)))) return 75;
  // vehicle slug embedded in car public id
  if (n.includes(s) || s.includes(n)) return 70;
  const st = new Set(s.split("-").filter((t) => t.length > 2));
  const nt = n.split("-").filter((t) => t.length > 2);
  let hit = 0;
  for (const t of nt) if (st.has(t)) hit += 1;
  if (hit >= 4) return 50 + hit;
  return 0;
}

(async () => {
  if (!fs.existsSync(INV)) throw new Error("inventory missing");
  const inv = JSON.parse(fs.readFileSync(INV, "utf8"));
  const all = (inv.resources || []).filter((r) => !ADULT_RE.test(r.public_id));

  const byKind = {
    banners: all.filter((r) => /\/banners\//.test(r.public_id)),
    favicon: all.filter((r) => /favicon/i.test(r.public_id)),
    cars: all.filter((r) => /\/cars\//.test(r.public_id)),
    categories: all.filter((r) => /\/categories\//.test(r.public_id)),
    blog: all.filter((r) => /\/blog\//.test(r.public_id)),
    products: all.filter((r) => /\/products\//.test(r.public_id)),
  };

  const report = {
    apply: APPLY,
    plan: [
      "brand/favicon/logo/og",
      "banners",
      "brandStory",
      "vehicles",
      "categories",
      "blogs",
      "products",
      "carcatalogs",
    ],
    brand: {},
    banners: {},
    brandStory: {},
    vehicles: {},
    categories: {},
    blogs: {},
    products: {},
    carcatalogs: {},
    errors: [],
  };

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  // ───────── 1) BRAND ─────────
  {
    const settings = await db.collection("settings").findOne({});
    const fav = byKind.favicon.sort((a, b) => (b.width || 0) - (a.width || 0))[0];
    const brandUpdates = {};

    if (fav) {
      const rel = `brand/crazzycars-favicon-${hash(fav.public_id)}.${fav.format || "png"}`;
      const abs = path.join(MEDIA, rel);
      if (APPLY) await download(fav.secure_url, abs);
      const url = publicUrl(rel);
      brandUpdates["general.favicon"] = {
        url,
        publicId: fav.public_id,
        altText: "CrazzyCars.pk favicon",
        imageName: "crazzycars-pk-favicon",
      };
      brandUpdates["general.faviconUrl"] = url;
      report.brand.favicon = rel;
    }

    // Ensure logo has SEO naming (re-copy existing or keep)
    const logoRel = "brand/crazzycars-pk-logo.webp";
    const logoSrc = path.join(MEDIA, "brand/crazzycars-logo.webp");
    const logoDst = path.join(MEDIA, logoRel);
    if (fs.existsSync(logoSrc)) {
      if (APPLY) fs.copyFileSync(logoSrc, logoDst);
      const logoUrl = publicUrl(logoRel);
      brandUpdates["general.logo.url"] = logoUrl;
      brandUpdates["general.logo.publicId"] = "local:brand/crazzycars-pk-logo.webp";
      brandUpdates["general.logo.altText"] = "CrazzyCars.pk — Car Accessories Pakistan";
      brandUpdates["general.logo.imageName"] = "crazzycars-pk-logo";
      brandUpdates["general.logoUrl"] = logoUrl;
      brandUpdates.logoUrl = logoUrl;
      report.brand.logo = logoRel;
    }

    // OG image SEO rename
    const ogCurrent = settings?.seo?.ogImage || "";
    if (ogCurrent && /\/media\//.test(ogCurrent)) {
      const ogRel = "brand/crazzycars-pk-og-image.webp";
      try {
        const srcPath = ogCurrent.replace(/^https?:\/\/[^/]+\/media\//, "").split("?")[0];
        const absSrc = path.join(MEDIA, srcPath);
        if (fs.existsSync(absSrc)) {
          if (APPLY) fs.copyFileSync(absSrc, path.join(MEDIA, ogRel));
          brandUpdates["seo.ogImage"] = publicUrl(ogRel);
          report.brand.og = ogRel;
        }
      } catch (e) {
        report.errors.push(`og:${e.message}`);
      }
    }

    if (APPLY && Object.keys(brandUpdates).length) {
      await db.collection("settings").updateOne(
        { _id: settings._id },
        { $set: { ...brandUpdates, updatedAt: new Date() } }
      );
    }
    report.brand.updatedFields = Object.keys(brandUpdates).length;
  }

  // ───────── 2) BANNERS ─────────
  {
    const heroes = byKind.banners
      .filter((r) => (r.width || 0) >= 2000 && (r.height || 0) >= 700)
      .sort((a, b) => b.bytes - a.bytes);
    // Prefer distinct public ids — take top unique by size
    const picked = heroes.slice(0, 8);
    const mobiles = byKind.banners
      .filter((r) => (r.height || 0) > (r.width || 0) || /mobile/i.test(r.public_id))
      .sort((a, b) => (b.height || 0) - (a.height || 0));

    const banners = await db.collection("banners").find({}).sort({ sortOrder: 1 }).toArray();
    const seoNames = [
      {
        file: "crazzycars-pk-hero-1-premium-accessories-desktop",
        alt: "CrazzyCars.pk premium car accessories and body kits in Pakistan",
        mobileFile: "crazzycars-pk-hero-1-premium-accessories-mobile",
      },
      {
        file: "crazzycars-pk-hero-2-body-kits-carbon-desktop",
        alt: "Car body kits and carbon fiber styling – CrazzyCars.pk Pakistan",
        mobileFile: "crazzycars-pk-hero-2-body-kits-carbon-mobile",
      },
      {
        file: "crazzycars-pk-hero-3-civic-interior-desktop",
        alt: "Honda Civic interior carbon and ambient lighting – CrazzyCars.pk",
        mobileFile: "crazzycars-pk-hero-3-civic-interior-mobile",
      },
      {
        file: "crazzycars-pk-hero-4-led-lighting-desktop",
        alt: "LED headlights fog lights and car lighting – CrazzyCars.pk Pakistan",
        mobileFile: "crazzycars-pk-hero-4-led-lighting-mobile",
      },
    ];

    let updated = 0;
    for (let i = 0; i < Math.min(banners.length, seoNames.length); i += 1) {
      const b = banners[i];
      const meta = seoNames[i];
      const desk = picked[i] || picked[0];
      const mob = mobiles[i] || mobiles[0] || desk;
      if (!desk) continue;

      const deskExt = (desk.format || "webp").toLowerCase().replace("jpeg", "jpg");
      const mobExt = (mob.format || "webp").toLowerCase().replace("jpeg", "jpg");
      const deskRel = `banners/${meta.file}.${deskExt}`;
      const mobRel = `banners/${meta.mobileFile}.${mobExt}`;

      if (APPLY) {
        await download(desk.secure_url, path.join(MEDIA, deskRel));
        await download(mob.secure_url, path.join(MEDIA, mobRel));
      }

      const desktopUrl = publicUrl(deskRel);
      const mobileUrl = publicUrl(mobRel);
      const setDoc = {
        "background.image.url": desktopUrl,
        "background.image.publicId": desk.public_id,
        "background.image.imageName": meta.file,
        "background.image.altText": meta.alt,
        "background.mobileImage.url": mobileUrl,
        "background.mobileImage.publicId": mob.public_id,
        "background.mobileImage.imageName": meta.mobileFile,
        "background.mobileImage.altText": meta.alt,
        updatedAt: new Date(),
      };
      if (APPLY) await db.collection("banners").updateOne({ _id: b._id }, { $set: setDoc });
      updated += 1;
    }
    report.banners = { candidates: picked.length, updated, mobiles: mobiles.length };
  }

  // ───────── 3) BRAND STORY ─────────
  {
    const settings = await db.collection("settings").findOne({});
    const story = settings?.brandStory || {};
    const storyUpdates = {};
    const pairs = [
      ["image1", "crazzycars-pk-brand-story-workshop", "CrazzyCars.pk Gujranwala car accessories workshop"],
      ["image2", "crazzycars-pk-brand-story-builds", "Pakistani car builds and accessories – CrazzyCars.pk"],
    ];
    // Prefer wide banner-ish assets or existing files rehosted
    const storySources = byKind.banners
      .filter((r) => (r.width || 0) >= 1000)
      .sort((a, b) => b.bytes - a.bytes);

    for (let i = 0; i < pairs.length; i += 1) {
      const [key, fileBase, alt] = pairs[i];
      const current = story[key];
      let srcUrl = null;
      let publicId = "";
      if (storySources[i + 4]) {
        srcUrl = storySources[i + 4].secure_url;
        publicId = storySources[i + 4].public_id;
      } else if (current && /\/media\//.test(current)) {
        // re-copy local to SEO name
        const relOld = current.replace(/^https?:\/\/[^/]+\/media\//, "").split("?")[0];
        const absOld = path.join(MEDIA, relOld);
        if (fs.existsSync(absOld)) {
          const ext = path.extname(absOld) || ".webp";
          const rel = `brand/${fileBase}${ext}`;
          if (APPLY) fs.copyFileSync(absOld, path.join(MEDIA, rel));
          storyUpdates[`brandStory.${key}`] = publicUrl(rel);
          continue;
        }
      }
      if (srcUrl) {
        const ext = path.extname(new URL(srcUrl).pathname) || ".webp";
        const rel = `brand/${fileBase}${ext}`;
        if (APPLY) await download(srcUrl, path.join(MEDIA, rel));
        storyUpdates[`brandStory.${key}`] = publicUrl(rel);
      }
    }
    if (APPLY && Object.keys(storyUpdates).length) {
      await db.collection("settings").updateOne({ _id: settings._id }, { $set: { ...storyUpdates, updatedAt: new Date() } });
    }
    report.brandStory = { fields: Object.keys(storyUpdates).length };
  }

  // ───────── 4) VEHICLES ─────────
  {
    const vehicles = await db.collection("vehicles").find({}).toArray();
    let attached = 0;
    let fallback = 0;
    for (const v of vehicles) {
      const slug = String(v.slug || "").toLowerCase();
      const name = v.name || slug;
      let hits = byKind.cars
        .map((r) => ({ r, score: scoreSlug(slug, r.public_id) }))
        .filter((x) => x.score >= 70)
        .sort((a, b) => b.score - a.score);

      // also match when car public_id contains slug tokens
      if (!hits.length) {
        hits = byKind.cars
          .map((r) => ({ r, score: scoreSlug(slug, r.public_id) }))
          .filter((x) => x.score >= 50)
          .sort((a, b) => b.score - a.score);
      }

      let chosen = hits[0]?.r || null;
      let via = "cloudinary-car";

      if (!chosen) {
        // fallback: first product image matching major tokens (civic, corolla, etc.)
        const tokens = slug.split("-").filter((t) => t.length > 3 && !/^\d+$/.test(t)).slice(0, 4);
        const prodHit = byKind.products.find((r) => {
          const n = r.public_id.toLowerCase();
          return tokens.filter((t) => n.includes(t)).length >= Math.min(2, tokens.length);
        });
        if (prodHit) {
          chosen = prodHit;
          via = "product-fallback";
          fallback += 1;
        }
      }

      if (!chosen) continue;
      const ext = (chosen.format || "webp").toLowerCase();
      const file = `vehicles/${slug}-${hash(chosen.public_id)}.${ext}`;
      if (APPLY) await download(chosen.secure_url, path.join(MEDIA, file));
      const url = publicUrl(file);
      const image = {
        url,
        publicId: chosen.public_id,
        altText: seoVehicleAlt(name),
        imageName: `crazzycars-pk-${slug}`,
        title: `${name} Accessories Pakistan`,
      };
      if (APPLY) {
        await db.collection("vehicles").updateOne(
          { _id: v._id },
          {
            $set: {
              image,
              thumbnail: url,
              "media.images": [{ ...image, isMain: true }],
              updatedAt: new Date(),
            },
          }
        );
      }
      attached += 1;
      if (via === "cloudinary-car") {
        /* counted in attached */
      }
    }
    report.vehicles = { total: vehicles.length, attached, fallback };
  }

  // ───────── 5) CATEGORIES ─────────
  {
    const cats = await db.collection("categories").find({}).toArray();
    let seoFixed = 0;
    let upgraded = 0;
    for (const cat of cats) {
      const slug = String(cat.slug || "").toLowerCase();
      const name = cat.name || slug;
      const hits = byKind.categories
        .map((r) => ({ r, score: scoreSlug(slug, r.public_id) }))
        .filter((x) => x.score >= 60)
        .sort((a, b) => b.score - a.score || (b.r.width || 0) - (a.r.width || 0));

      const cur = cat.image || {};
      const set = {
        "image.altText": seoCatAlt(name),
        "image.title": `${name} – Car Accessories Pakistan | CrazzyCars.pk`,
        "image.imageName": `crazzycars-pk-category-${slug}`,
        updatedAt: new Date(),
      };

      const best = hits[0]?.r;
      if (best && ((best.width || 0) >= 800 || !(cur.url || ""))) {
        const ext = (best.format || "webp").toLowerCase();
        const rel = `categories/${slug}-${hash(best.public_id)}.${ext}`;
        if (APPLY) await download(best.secure_url, path.join(MEDIA, rel));
        set["image.url"] = publicUrl(rel);
        set["image.publicId"] = best.public_id;
        upgraded += 1;
      } else if (cur.url) {
        // keep url, still SEO fields
        seoFixed += 1;
      }

      if (APPLY) await db.collection("categories").updateOne({ _id: cat._id }, { $set: set });
      else seoFixed += 1;
    }
    report.categories = { total: cats.length, seoFixed, upgraded };
  }

  // ───────── 6) BLOGS ─────────
  {
    const blogs = await db.collection("blogposts").find({}).toArray();
    let updated = 0;
    for (const b of blogs) {
      const slug = String(b.slug || "").toLowerCase();
      const title = b.title || slug;
      // Prefer related product images by keywords in slug
      const tokens = slug.split("-").filter((t) => t.length > 3 && !/^(guide|pakistan|best|how|what|with|from|that|this|each|every)$/.test(t));
      let chosen = null;
      let bestScore = 0;
      for (const r of byKind.products) {
        const n = r.public_id.toLowerCase();
        let sc = 0;
        for (const t of tokens) if (n.includes(t)) sc += 1;
        if (sc > bestScore && sc >= 2) {
          bestScore = sc;
          chosen = r;
        }
      }
      // keep existing if no good match, but rewrite to SEO filename
      let srcUrl = chosen?.secure_url || b.featuredImage?.url || "";
      let publicId = chosen?.public_id || b.featuredImage?.publicId || "";
      if (!srcUrl) continue;

      const ext =
        (chosen?.format ||
          (srcUrl.match(/\.([a-z0-9]+)(?:\?|$)/i) || [])[1] ||
          "webp"
        ).toLowerCase();
      const fileBase = `crazzycars-pk-blog-${slug}`.slice(0, 100);
      const rel = `blogs/${fileBase}-${hash(srcUrl)}.${ext}`;

      try {
        if (APPLY) {
          if (/res\.cloudinary\.com/i.test(srcUrl)) {
            await download(srcUrl, path.join(MEDIA, rel));
          } else if (/\/media\//i.test(srcUrl)) {
            const oldRel = srcUrl.replace(/^https?:\/\/[^/]+\/media\//, "").split("?")[0];
            const absOld = path.join(MEDIA, oldRel);
            if (fs.existsSync(absOld)) fs.copyFileSync(absOld, path.join(MEDIA, rel));
            else if (/^https?:/i.test(srcUrl)) await download(srcUrl, path.join(MEDIA, rel));
            else continue;
          } else {
            await download(srcUrl, path.join(MEDIA, rel));
          }
        }
        const url = publicUrl(rel);
        if (APPLY) {
          await db.collection("blogposts").updateOne(
            { _id: b._id },
            {
              $set: {
                featuredImage: {
                  url,
                  publicId: publicId || `local:${rel}`,
                  altText: seoBlogAlt(title),
                  imageName: fileBase,
                },
                updatedAt: new Date(),
              },
            }
          );
        }
        updated += 1;
      } catch (e) {
        report.errors.push(`blog:${slug}:${e.message}`);
      }
    }
    report.blogs = { total: blogs.length, updated };
  }

  // ───────── 7) PRODUCTS (SEO naming + alts + backfill) ─────────
  {
    const products = await db.collection("products").find({ status: "active" }).toArray();
    let alts = 0;
    let renamed = 0;
    let added = 0;
    let fixedMain = 0;

    for (const p of products) {
      const slug = String(p.slug || "").toLowerCase();
      const name = p.name || slug;
      let images = Array.isArray(p.media?.images) ? [...p.media.images] : [];
      let changed = false;

      // Fix mismatched main (filename tokens vs slug)
      if (images[0]?.url) {
        const mainFile = (images[0].url.split("/").pop() || "").toLowerCase();
        const slugTok = slug.split("-").filter((t) => t.length > 3).slice(0, 3);
        const overlap = slugTok.filter((t) => mainFile.includes(t)).length;
        if (slugTok.length >= 2 && overlap === 0) {
          const better = images.findIndex((im, idx) => {
            if (idx === 0) return false;
            const f = (im.url || "").split("/").pop().toLowerCase();
            return slugTok.filter((t) => f.includes(t)).length >= 2;
          });
          if (better > 0) {
            const [m] = images.splice(better, 1);
            images.unshift(m);
            fixedMain += 1;
            changed = true;
          }
        }
      }

      // SEO alts + imageName
      images = images.map((im, i) => {
        const next = { ...im };
        const a = String(next.altText || "").trim();
        if (!a || a.length < 8 || /^(image|photo|img|alt)\d*$/i.test(a) || a.toLowerCase() === slug) {
          next.altText = seoProductAlt(name);
          alts += 1;
          changed = true;
        }
        const desiredName = `crazzycars-pk-${slug}-${i + 1}`;
        if (next.imageName !== desiredName) {
          next.imageName = desiredName;
          renamed += 1;
          changed = true;
        }
        next.isMain = i === 0;
        return next;
      });

      // Gallery backfill from Cloudinary
      const hits = byKind.products
        .map((r) => ({ r, score: scoreSlug(slug, r.public_id) }))
        .filter((x) => x.score >= 70)
        .sort((a, b) => b.score - a.score);
      const uniqHits = [];
      const seenPid = new Set();
      for (const h of hits) {
        if (seenPid.has(h.r.public_id)) continue;
        seenPid.add(h.r.public_id);
        uniqHits.push(h.r);
      }
      const want = Math.min(6, uniqHits.length);
      while (images.length < want) {
        const hit = uniqHits[images.length];
        if (!hit) break;
        const ext = (hit.format || "webp").toLowerCase();
        const rel = `products/${slug}-${images.length + 1}-${hash(hit.public_id)}.${ext}`;
        try {
          if (APPLY) await download(hit.secure_url, path.join(MEDIA, rel));
          images.push({
            url: publicUrlClean(rel),
            publicId: hit.public_id,
            isMain: images.length === 0,
            altText: seoProductAlt(name),
            imageName: `crazzycars-pk-${slug}-${images.length + 1}`,
            width: hit.width,
            height: hit.height,
          });
          added += 1;
          changed = true;
        } catch (e) {
          report.errors.push(`product-dl:${slug}:${e.message}`);
          break;
        }
      }

      if (changed && APPLY) {
        await db.collection("products").updateOne(
          { _id: p._id },
          { $set: { "media.images": images, updatedAt: new Date() } }
        );
      }
    }
    report.products = { total: products.length, alts, renamed, added, fixedMain };
  }

  // ───────── 8) CAR CATALOGS ─────────
  {
    const catalogs = await db.collection("carcatalogs").find({}).toArray();
    let updated = 0;
    for (const cat of catalogs) {
      const slug = String(cat.slug || cat.name || "").toLowerCase();
      // use a vehicle image that starts with brand
      const veh = await db.collection("vehicles").findOne({
        slug: { $regex: `^${slugify(slug).split("-")[0]}` },
        "image.url": { $exists: true },
      });
      if (!veh?.image?.url) continue;
      if (APPLY) {
        await db.collection("carcatalogs").updateOne(
          { _id: cat._id },
          {
            $set: {
              image: {
                url: veh.image.url,
                publicId: veh.image.publicId || "",
                altText: `${cat.name || slug} car accessories Pakistan | CrazzyCars.pk`,
                imageName: `crazzycars-pk-brand-${slugify(slug)}`,
              },
              updatedAt: new Date(),
            },
          }
        );
      }
      updated += 1;
    }
    report.carcatalogs = { total: catalogs.length, updated };
  }

  fs.writeFileSync("/tmp/complete-website-media-seo-report.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await client.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
