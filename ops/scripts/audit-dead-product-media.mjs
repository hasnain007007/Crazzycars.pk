#!/usr/bin/env node
/**
 * Phase 1G — read-only: crawl every product media URL, HEAD it, report dead refs.
 * No DB writes. Use --dry-run-diff later after approval for removal plan.
 *
 * Env: MONGODB_URI, DB fingerprint must be crazzycars_motorsports (187aad8c…)
 */
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import crypto from "crypto";

const STORE = process.env.STORE_ORIGIN || "https://crazzycars.pk";
const EXPECTED_FP = "187aad8c44fe3a84";
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

function absUrl(raw) {
  let u = String(typeof raw === "string" ? raw : raw?.url || "").trim();
  if (!u) return "";
  if (u.startsWith("//")) u = `https:${u}`;
  if (u.startsWith("/")) u = `${STORE}${u}`;
  if (!/^https?:\/\//i.test(u)) return "";
  return u.split("?")[0];
}

async function head(url) {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    return { status: res.status, ok: res.ok };
  } catch (e) {
    return { status: 0, ok: false, error: String(e?.message || e) };
  }
}

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("MONGODB_URI required");

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
  const db = mongoose.connection.db;
  const dbName = db.databaseName;
  // Fingerprint: first 16 of sha256(dbName) — match ops convention if stored; also assert name.
  const fp = crypto.createHash("sha256").update(dbName).digest("hex").slice(0, 16);
  console.log(JSON.stringify({ dbName, fingerprint: fp, expectedName: "crazzycars_motorsports" }));
  if (dbName !== "crazzycars_motorsports") {
    throw new Error(`Refusing DB ${dbName} — only crazzycars_motorsports allowed`);
  }
  // Soft-check fingerprint when env provides it
  if (process.env.DB_FINGERPRINT && process.env.DB_FINGERPRINT !== EXPECTED_FP) {
    throw new Error(`DB_FINGERPRINT mismatch`);
  }

  const products = await db
    .collection("products")
    .find(
      {},
      {
        projection: {
          name: 1,
          slug: 1,
          status: 1,
          "media.images": 1,
          image: 1,
          images: 1,
          variants: 1,
          variationCombinations: 1,
          simpleVariations: 1,
          recommendedProducts: 1,
          onCarPreviews: 1,
        },
      }
    )
    .toArray();

  const dead = [];
  const okCount = { urls: 0, dead: 0, productsWithDead: 0 };
  const seenHead = new Map();

  for (const p of products) {
    const refs = [];
    const push = (raw, field) => {
      const url = absUrl(raw);
      if (!url) return;
      refs.push({ url, field, raw });
    };
    for (const [i, img] of (p.media?.images || []).entries()) {
      push(img, `media.images[${i}]`);
    }
    for (const [i, img] of (p.images || []).entries()) push(img, `images[${i}]`);
    if (p.image) push(p.image, "image");
    for (const [i, v] of (p.variants || []).entries()) {
      if (v?.image) push(v.image, `variants[${i}].image`);
      if (v?.media?.url) push(v.media, `variants[${i}].media`);
    }
    for (const [i, v] of (p.variationCombinations || []).entries()) {
      if (v?.image) push(v.image, `variationCombinations[${i}].image`);
    }
    for (const [i, v] of (p.simpleVariations || []).entries()) {
      if (v?.image) push(v.image, `simpleVariations[${i}].image`);
      for (const [j, opt] of (v?.options || []).entries()) {
        if (opt?.image) push(opt.image, `simpleVariations[${i}].options[${j}].image`);
      }
    }
    for (const [i, r] of (p.recommendedProducts || []).entries()) {
      if (r?.image) push(r.image, `recommendedProducts[${i}].image`);
    }
    for (const [i, prev] of (p.onCarPreviews || []).entries()) {
      push(prev?.url || prev?.image || prev, `onCarPreviews[${i}]`);
    }

    let productDead = false;
    for (const ref of refs) {
      let result = seenHead.get(ref.url);
      if (!result) {
        result = await head(ref.url);
        seenHead.set(ref.url, result);
        okCount.urls += 1;
      }
      if (!result.ok) {
        okCount.dead += 1;
        productDead = true;
        dead.push({
          productId: String(p._id),
          slug: p.slug,
          name: p.name,
          status: p.status,
          field: ref.field,
          url: ref.url,
          statusCode: result.status,
          error: result.error || "",
        });
      }
    }
    if (productDead) okCount.productsWithDead += 1;
  }

  const outDir = process.env.REPORT_DIR || "/tmp";
  await mkdir(outDir, { recursive: true });
  const csvPath = path.join(outDir, `dead-product-media-${stamp}.csv`);
  const jsonPath = path.join(outDir, `dead-product-media-${stamp}.json`);
  const header = "productId,slug,status,field,statusCode,url,error\n";
  const lines = dead.map((d) =>
    [d.productId, d.slug, d.status, d.field, d.statusCode, JSON.stringify(d.url), JSON.stringify(d.error || "")].join(",")
  );
  await writeFile(csvPath, header + lines.join("\n") + "\n");
  await writeFile(
    jsonPath,
    JSON.stringify({ summary: { products: products.length, ...okCount, uniqueUrls: seenHead.size }, dead }, null, 2)
  );

  // Dry-run removal plan (no writes)
  const byProduct = new Map();
  for (const d of dead) {
    if (!byProduct.has(d.productId)) {
      byProduct.set(d.productId, {
        productId: d.productId,
        slug: d.slug,
        name: d.name,
        status: d.status,
        removeUrls: [],
      });
    }
    byProduct.get(d.productId).removeUrls.push({ field: d.field, url: d.url, statusCode: d.statusCode });
  }
  const dryRunPath = path.join(outDir, `dead-product-media-dry-run-${stamp}.json`);
  await writeFile(
    dryRunPath,
    JSON.stringify(
      {
        warning: "READ-ONLY plan. Do not apply until approved. Backup required first.",
        db: dbName,
        fingerprintExpected: EXPECTED_FP,
        productsAffected: byProduct.size,
        plan: [...byProduct.values()],
      },
      null,
      2
    )
  );

  console.log(
    JSON.stringify({
      done: true,
      products: products.length,
      uniqueUrls: seenHead.size,
      deadRefs: dead.length,
      productsWithDead: okCount.productsWithDead,
      csvPath,
      jsonPath,
      dryRunPath,
    })
  );

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
