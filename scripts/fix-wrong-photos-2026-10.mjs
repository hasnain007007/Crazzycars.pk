#!/usr/bin/env node
/**
 * Wrong product photos (visual audit of all 399 active products, 2026-10-31).
 *
 * Each photo below was checked by eye. The products in REMOVE show a photo of a different
 * product (copied from a neighbour during the catalogue import; the Shopify export has no
 * photo for them). Their wrong photos are removed so the page shows "Photo coming soon"
 * (the storefront already noindexes those and leaves them out of the sitemap) until the
 * owner uploads a real photo. The product that the photo really belongs to keeps it.
 * REORDER: the correct photo is already in the product's own gallery — it becomes main.
 *
 * Touches ONLY media.images. Dry run by default.
 *   node scripts/fix-wrong-photos-2026-10.mjs --products full-products.json
 *   MONGODB_URI=… node scripts/fix-wrong-photos-2026-10.mjs [--apply --allow-write]
 * --apply refuses any database but the live fingerprint and writes a backup first.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { LIVE_URI_FINGERPRINT, assertLiveWriteFingerprint } from "./mongo/prodFingerprint.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const arg = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : null);
const APPLY = args.includes("--apply") && args.includes("--allow-write");

/** SKU → what the current photo actually shows (and whose photo it is). */
export const REMOVE = {
  "CC-0282": "steering-wheel trims (CC-0024's photo, carzstore watermark), not door panels",
  "CC-0281": "cup-holder trim (CC-0280's photo), not a dashboard trim",
  "CC-0279": "outer door-handle covers with a Yaris (CC-0025's photo), not interior panels",
  "11": "a 'bugs ncode' software logo, not a welcome light",
  "CC-COR-RGB-KIT": "shark-fin diffuser (CC-0022's photo)",
  "CC-0014": "shark-fin diffuser (CC-0022's photo)",
  "CC-CIV-DIFF-X-LED": "Corolla shark-fin diffuser (CC-0022's photo), not a Civic X diffuser",
  "CC-COR-BBL-2": "a whole white Toyota Yaris car, no bumper light",
  "CC-COR-BBL-E120": "side skirts, not a bumper light",
  "CC-COR-MIRROR-3": "Corolla 2009–2014 indicators (CC-0015's photo), product is 2014–2026",
  "CC-LGT-204": "Corolla 2009–2014 indicators (CC-0015's photo), product is for Civic Rebirth",
  "CC-LGT-203": "Corolla 2009–2014 indicators (CC-0015's photo), product is for Honda City",
  "CC-SWF-DHC-CF": "door-handle covers with a Yaris (CC-0025's photo), product is for Swift",
  "CC-SPO-MIR-BAT": "mirror covers on a Toyota Aqua (CC-TAQ-EXT-SMC-CF's photo), product is for KIA Sportage",
  "CC-HAV-MIR-BAT": "mirror covers on a Toyota Aqua, product is for Haval H6",
  "CC-PRI-MIR-BAT-17": "mirror covers on a Toyota Aqua, product is for Prius 2017–2021",
  "CC-BRV-MIR-BAT": "mirror covers on a Toyota Aqua, product is for Honda BR-V",
  "CC-RAI-MIR-BAT": "mirror covers on a Toyota Aqua, product is for Toyota Raize",
  "CC-VEZ-LED-RBL": "an instrument-cluster trim, not a rear bumper brake lamp",
  "CC-VEZ-DRL-HD011": "OSRAM projector bulbs (CC-LGT-202's photo), not a Vezel DRL cover",
  "CC-VEZ-TRUNK-PVC": "a front lip on a Honda City, not a Vezel trunk mat",
  "CC-COR-GRL-TRD-09": "a 2017 Corolla front (CC-0029's photo), product is for 2009–2013",
  "CC-COR-GRL-DIA-08": "a 2017 Corolla front, product is a 2008–2010 grille",
  "CC-COR-GRL-SET-08": "a 2017 Corolla front, product is a 2008–2011 grille set",
  "CC-EXT-109": "Civic X SI grille (CC-EXT-107's photo), product is a Civic Rebirth mesh grille",
  "CC-CIV-SPLR-MUG-RR": "a front grille, not a Mugen trunk spoiler",
  "CC-CIV-SPLR-ES": "a front grille on a Civic Reborn, not a Civic 2001–2005 trunk spoiler",
  "CC-ALS-SPLR-LIP": "a spoiler on a Honda City, product is for Changan Alsvin",
};

/** SKU → file (already in its gallery) that becomes the main photo. */
export const REORDER = {
  "CC-0149": "suzuki-alto-carbon-fiber-mirror-covers-2-2a50d483e5.webp",
  "CC-0131": "carbon-fiber-side-mirror-cover-suzuki-swift-2025-present-2-42a2a377cc.webp",
  "CC-0120": "honda-civic-reborn-2006-2012-abs-plastic-roof-spoiler-2-00bea8d1f6.webp",
};

const file = (u) => String(u || "").split("?")[0].split("/").pop();

/** New media.images for one product, or null when nothing changes. */
export function planPhotos(p) {
  const sku = String(p.articleNo || "");
  const imgs = Array.isArray(p.media?.images) ? p.media.images : [];
  if (REMOVE[sku]) return imgs.length ? { images: [], why: `remove: ${REMOVE[sku]}` } : null;
  const want = REORDER[sku];
  if (want) {
    const hit = imgs.find((i) => file(i.url) === want);
    if (!hit || (hit.isMain && imgs[0] === hit)) return null;
    const rest = imgs.filter((i) => i !== hit).map((i) => ({ ...i, isMain: false }));
    return { images: [{ ...hit, isMain: true }, ...rest], why: `main photo → ${want}` };
  }
  return null;
}

async function load() {
  if (arg("--products")) {
    const j = JSON.parse(fs.readFileSync(arg("--products"), "utf8"));
    return { source: "json", products: Array.isArray(j) ? j : j.products || j.data };
  }
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("Pass --products <json> or set MONGODB_URI.");
  const fp = crypto.createHash("sha256").update(uri).digest("hex").slice(0, 16);
  if (APPLY) {
    const ok = assertLiveWriteFingerprint(fp);
    if (!ok.ok) throw new Error(`Refusing to write: ${ok.reason} (expected ${LIVE_URI_FINGERPRINT}).`);
  }
  const mongoose = createRequire(path.join(ROOT, "storecraft-admin/package.json"))("mongoose");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  return { source: `db ${fp}`, products: await db.collection("products").find({}).toArray(), db, mongoose };
}

async function main() {
  const data = await load();
  const plans = data.products.map((p) => ({ p, plan: planPhotos(p) })).filter((x) => x.plan);
  const missing = [...Object.keys(REMOVE), ...Object.keys(REORDER)].filter(
    (sku) => !data.products.some((p) => p.articleNo === sku)
  );
  const lines = [
    `Wrong-photo fix — ${data.source} — ${new Date().toISOString()}`,
    `${plans.length} products would change (only media.images).${missing.length ? ` Not found: ${missing.join(", ")}` : ""}`,
    "",
    ...plans.map(
      ({ p, plan }) =>
        `${p.articleNo}\t${p.slug}\t${(p.media?.images || []).length} → ${plan.images.length} photos\t${plan.why}`
    ),
  ];
  const outDir = path.join(ROOT, "scripts/out");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, APPLY ? "wrong-photos-apply.txt" : "wrong-photos-dryrun.txt"), lines.join("\n") + "\n");
  console.log(lines.slice(0, 2).join("\n"));

  if (!APPLY) {
    if (data.mongoose) await data.mongoose.disconnect();
    return;
  }
  if (!data.db) throw new Error("--apply needs MONGODB_URI.");
  fs.writeFileSync(
    path.join(outDir, `wrong-photos-backup-${Date.now()}.json`),
    JSON.stringify(plans.map(({ p }) => ({ _id: String(p._id), sku: p.articleNo, images: p.media?.images || [] })), null, 2)
  );
  let n = 0;
  for (const { p, plan } of plans) {
    const r = await data.db.collection("products").updateOne({ _id: p._id }, { $set: { "media.images": plan.images } });
    n += r.modifiedCount;
  }
  console.log(`Applied to ${n} products. Re-run without --apply: it should report 0.`);
  await data.mongoose.disconnect();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e) => {
    console.error(e.message || e);
    process.exit(2);
  });
}
