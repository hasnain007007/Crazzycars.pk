/**
 * Fetch matching Cloudinary gallery frames onto VPS /media and continue SEO:
 * - fuzzy-match public_ids → product slugs
 * - download extra angles not yet on disk
 * - set SEO altText = product name (+ Pakistan cue when short)
 * - keep serving local /media (stable); store cloudinary publicId for reference
 *
 * Run in store container:
 *   node /tmp/sync-cloudinary-seo-continue.cjs
 *   node /tmp/sync-cloudinary-seo-continue.cjs --apply
 */
const { MongoClient } = require("/app/node_modules/mongodb");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");

const APPLY = process.argv.includes("--apply");
const MEDIA_ROOT = process.env.MEDIA_ROOT || "/app/media";
const ORIGIN = (process.env.NEXT_PUBLIC_STORE_URL || "https://crazzycars.pk").replace(/\/$/, "");
const INV = "/tmp/cloudinary-full-inventory.json";

function leaf(publicId) {
  return String(publicId || "").split("/").pop() || "";
}

/** Strip trailing -N or -N-hash / -hash */
function normLeaf(publicId) {
  return leaf(publicId)
    .replace(/\.(webp|jpe?g|png|gif)$/i, "")
    .replace(/-\d+-[0-9a-f]{8,}$/i, "")
    .replace(/-[0-9a-f]{10,}$/i, "")
    .replace(/-\d+$/i, "")
    .toLowerCase();
}

function isProductResource(publicId) {
  return /\/products\//.test(publicId) || /^storecraft\/products\//.test(publicId);
}

function scoreMatch(slug, publicId) {
  const s = String(slug || "").toLowerCase();
  const n = normLeaf(publicId);
  if (!s || !n) return 0;
  if (s === n) return 100;
  if (s.startsWith(n) && n.length >= 20) return 90;
  if (n.startsWith(s) && s.length >= 20) return 88;
  // truncated autoaesthetic leaves
  const prefix = s.slice(0, Math.min(48, s.length));
  if (n.startsWith(prefix) || prefix.startsWith(n.slice(0, Math.min(48, n.length)))) {
    return 70 + Math.min(20, Math.floor(Math.min(n.length, s.length) / 5));
  }
  // token overlap
  const st = new Set(s.split("-").filter((t) => t.length > 2));
  const nt = n.split("-").filter((t) => t.length > 2);
  let hit = 0;
  for (const t of nt) if (st.has(t)) hit += 1;
  if (hit >= 5 && hit / Math.max(nt.length, 1) >= 0.6) return 55 + hit;
  return 0;
}

async function downloadToMedia(url, relPath) {
  const abs = path.join(MEDIA_ROOT, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  if (fs.existsSync(abs) && fs.statSync(abs).size > 1000) {
    return { abs, skipped: true };
  }
  const res = await fetch(url, {
    headers: { "User-Agent": "CrazzyCarsCloudinarySync/1.0" },
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 500) throw new Error("tiny file");
  fs.writeFileSync(abs, buf);
  return { abs, skipped: false, bytes: buf.length };
}

function publicMediaUrl(rel) {
  return `${ORIGIN}/media/${rel.replace(/^\/+/, "")}`;
}

function seoAlt(name) {
  const n = String(name || "").trim();
  if (!n) return "Car accessory – CrazzyCars.pk";
  if (/crazzycars/i.test(n)) return n;
  return `${n} – Buy Online Pakistan | CrazzyCars.pk`;
}

function shortHash(s) {
  return crypto.createHash("sha1").update(s).digest("hex").slice(0, 10);
}

(async () => {
  if (!fs.existsSync(INV)) throw new Error(`Missing ${INV}`);
  const inv = JSON.parse(fs.readFileSync(INV, "utf8"));
  const resources = (inv.resources || []).filter((r) => isProductResource(r.public_id));

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const col = client.db().collection("products");
  const products = await col
    .find({ status: "active" })
    .project({ name: 1, slug: 1, media: 1 })
    .toArray();

  const report = {
    apply: APPLY,
    matched: 0,
    unmatched: 0,
    altsFixed: 0,
    imagesAdded: 0,
    downloads: 0,
    downloadErrors: [],
    samples: [],
  };

  for (const p of products) {
    const scored = [];
    for (const r of resources) {
      const sc = scoreMatch(p.slug, r.public_id);
      if (sc >= 70) scored.push({ ...r, score: sc });
    }
    // dedupe by public_id, sort by score then public_id
    const byId = new Map();
    for (const r of scored) {
      const prev = byId.get(r.public_id);
      if (!prev || r.score > prev.score) byId.set(r.public_id, r);
    }
    const hits = [...byId.values()].sort((a, b) => b.score - a.score || a.public_id.localeCompare(b.public_id));

    if (!hits.length) {
      report.unmatched += 1;
      // still fix alts
    } else {
      report.matched += 1;
    }

    const images = Array.isArray(p.media?.images) ? [...p.media.images] : [];
    let changed = false;

    // Fix weak alts
    for (let i = 0; i < images.length; i += 1) {
      const a = String(images[i].altText || "").trim();
      if (!a || a.length < 8 || /^(image|photo|img)\d*$/i.test(a)) {
        images[i] = { ...images[i], altText: seoAlt(p.name) };
        report.altsFixed += 1;
        changed = true;
      }
    }

    // Existing local basenames to avoid dup downloads
    const existingBasenames = new Set();
    for (const im of images) {
      const u = String(im.url || "");
      const m = u.match(/\/media\/products\/([^/?#]+)/i);
      if (m) existingBasenames.add(m[1].toLowerCase());
      const pid = String(im.publicId || "");
      if (pid) existingBasenames.add(leaf(pid).toLowerCase());
    }

    // Backfill up to 6 extra Cloudinary frames when local has fewer
    const want = Math.min(6, hits.length);
    if (hits.length && images.length < want) {
      for (const hit of hits) {
        if (images.length >= want) break;
        const ext = (hit.format || "webp").toLowerCase().replace("jpeg", "jpg");
        const baseLeaf = leaf(hit.public_id).replace(/\.(webp|jpe?g|png)$/i, "");
        // skip if we already have a file whose name starts with same stem
        const stem = normLeaf(hit.public_id);
        const already = [...existingBasenames].some(
          (b) => b.includes(stem.slice(0, 30)) || stem.includes(b.replace(/\.[a-z]+$/, "").slice(0, 30))
        );
        if (already && images.length >= 1) {
          // only skip if we already have at least one; still allow additional numbered frames
          const num = (baseLeaf.match(/-(\d+)(?:-|$)/) || [])[1];
          if (num && [...existingBasenames].some((b) => b.includes(`-${num}-`) || b.includes(`-${num}.`))) {
            continue;
          }
        }

        const hash = shortHash(hit.public_id);
        const fileName = `${p.slug}-${images.length + 1}-${hash}.${ext}`;
        const rel = `products/${fileName}`;
        try {
          if (APPLY) {
            const dl = await downloadToMedia(hit.secure_url, rel);
            if (!dl.skipped) report.downloads += 1;
          }
          const url = publicMediaUrl(rel);
          images.push({
            url,
            publicId: hit.public_id,
            isMain: images.length === 0,
            altText: seoAlt(p.name),
            imageName: fileName,
            width: hit.width || undefined,
            height: hit.height || undefined,
          });
          existingBasenames.add(fileName.toLowerCase());
          report.imagesAdded += 1;
          changed = true;
        } catch (e) {
          report.downloadErrors.push({ slug: p.slug, url: hit.secure_url, err: String(e.message || e) });
        }
      }
    }

    // Ensure first is main
    if (images.length) {
      images.forEach((im, i) => {
        const should = i === 0;
        if (Boolean(im.isMain) !== should) {
          im.isMain = should;
          changed = true;
        }
      });
    }

    if (changed && report.samples.length < 12) {
      report.samples.push({
        slug: p.slug,
        images: images.length,
        cldHits: hits.length,
        top: hits.slice(0, 2).map((h) => h.public_id),
      });
    }

    if (APPLY && changed) {
      await col.updateOne(
        { _id: p._id },
        {
          $set: {
            "media.images": images,
            updatedAt: new Date(),
          },
        }
      );
    }
  }

  // Fix blog featuredImage alts for published/scheduled
  const blogs = await client.db().collection("blogposts").find({}).toArray();
  let blogAlt = 0;
  for (const b of blogs) {
    const url = b.featuredImage?.url || "";
    const alt = String(b.featuredImage?.altText || "").trim();
    if (url && (!alt || alt.length < 5)) {
      blogAlt += 1;
      if (APPLY) {
        await client.db().collection("blogposts").updateOne(
          { _id: b._id },
          {
            $set: {
              "featuredImage.altText": `${b.title} | CrazzyCars.pk Blog`,
              updatedAt: new Date(),
            },
          }
        );
      }
    }
  }
  report.blogAltsFixed = blogAlt;
  report.matchRate = Number(((report.matched / Math.max(products.length, 1)) * 100).toFixed(1));

  fs.writeFileSync("/tmp/cloudinary-seo-sync-report.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await client.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
