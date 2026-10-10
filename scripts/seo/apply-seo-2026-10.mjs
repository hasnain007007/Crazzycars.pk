#!/usr/bin/env node
/**
 * Idempotent Mongo SEO apply for Search Console audit (10 Oct 2026).
 *
 * Defaults to --dry-run. Never writes unless BOTH --apply and --allow-write
 * are passed. Refuses hosts that look like production unless
 * --i-know-this-is-staging is also set (still requires the two write flags).
 *
 * Usage (from repo root or storecraft-store):
 *   node --env-file=storecraft-store/.env.local scripts/seo/apply-seo-2026-10.mjs
 *   node --env-file=storecraft-store/.env.local scripts/seo/apply-seo-2026-10.mjs --apply --allow-write
 *
 * Backup (write mode only): seo-backup-2026-10.json in repo root.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import {
  PAGE_SEO_OVERRIDES,
  CATEGORY_H1_OVERRIDES,
  CATEGORY_DESCRIPTION_HTML,
  CATEGORY_APPLY_SKIP,
  VEHICLE_DESCRIPTION_HTML,
  PRODUCT_CONTENT_OVERRIDES,
  PRODUCT_NAME_OVERRIDES,
  PRODUCT_H1_OVERRIDES,
} from "../../storecraft-store/lib/seo/gscAudit2026-10.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const BACKUP_PATH = path.join(ROOT, "seo-backup-2026-10.json");
const require = createRequire(path.join(ROOT, "storecraft-store/package.json"));
const mongoose = require("mongoose");

const argv = new Set(process.argv.slice(2));
const DRY_RUN = !argv.has("--apply");
const ALLOW_WRITE = argv.has("--allow-write");
const FORCE_STAGING_ACK = argv.has("--i-know-this-is-staging");

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || "";

function looksLikeProductionUri(uri) {
  const u = String(uri || "").toLowerCase();
  return (
    u.includes("sialkot-mongo") ||
    u.includes("crazzycars") ||
    u.includes("mongodb+srv://") ||
    /:\s*27017/.test(u)
  );
}

function diff(label, before, after) {
  if (before === after) return null;
  return { field: label, before, after };
}

async function main() {
  if (!MONGO_URI) {
    console.error("Set MONGO_URI or MONGODB_URI (e.g. --env-file=storecraft-store/.env.local).");
    process.exit(1);
  }

  if (!DRY_RUN) {
    if (!ALLOW_WRITE) {
      console.error("Refusing write: pass --allow-write with --apply.");
      process.exit(1);
    }
    if (looksLikeProductionUri(MONGO_URI) && !FORCE_STAGING_ACK) {
      console.error(
        "URI looks like production/shared. Refusing. Use a staging DB, or pass --i-know-this-is-staging only after fingerprint checks in docs/OPS-PRODUCTION-DATABASE.md."
      );
      process.exit(1);
    }
  }

  console.log(DRY_RUN ? "=== DRY RUN (no writes) ===" : "=== APPLY MODE ===");

  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const products = db.collection("products");
  const categories = db.collection("categories");
  const vehicles = db.collection("vehicles");
  const carCatalog = db.collection("carcatalogs");

  const backup = { createdAt: new Date().toISOString(), products: [], categories: [], vehicles: [], carCatalog: [] };
  const changes = [];

  // --- Products: titles/metas/names/content ---
  const productSlugs = new Set([
    ...Object.keys(PAGE_SEO_OVERRIDES)
      .filter(
        (p) =>
          p.startsWith("/") &&
          !p.startsWith("/categories/") &&
          !p.startsWith("/cars/") &&
          p !== "/" &&
          p !== "/contact"
      )
      .map((p) => p.slice(1)),
    ...Object.keys(PRODUCT_NAME_OVERRIDES),
    ...Object.keys(PRODUCT_H1_OVERRIDES),
    ...Object.keys(PRODUCT_CONTENT_OVERRIDES),
  ]);

  for (const slug of productSlugs) {
    const pathKey = `/${slug}`;
    const seo = PAGE_SEO_OVERRIDES[pathKey] || {};
    const doc = await products.findOne({ slug });
    if (!doc) {
      console.log(`[miss] product ${slug}`);
      continue;
    }
    const nextTitle = seo.title || undefined;
    const nextMeta = seo.meta || undefined;
    const nameOverride = PRODUCT_NAME_OVERRIDES[slug];
    const content = PRODUCT_CONTENT_OVERRIDES[slug] || {};
    const patch = {};
    const before = {
      name: doc.name,
      metaTitle: doc.seo?.metaTitle || doc.metaTitle || "",
      metaDescription: doc.seo?.metaDescription || doc.metaDescription || "",
      shortDescription: doc.shortDescription || "",
      longDescription: doc.longDescription || "",
      features: doc.features || [],
    };

    if (nextTitle) {
      patch["seo.metaTitle"] = nextTitle;
      patch.metaTitle = nextTitle;
    }
    if (nextMeta) {
      patch["seo.metaDescription"] = nextMeta;
      patch.metaDescription = nextMeta;
    }
    if (nameOverride) patch.name = nameOverride;
    if (content.shortDescription) patch.shortDescription = content.shortDescription;
    if (content.appendDescription && !String(doc.longDescription || "").includes(content.appendDescription.slice(0, 40))) {
      patch.longDescription = `${doc.longDescription || ""}\n<p>${content.appendDescription}</p>`;
    }
    if (content.careHtml && !String(doc.longDescription || "").includes("microfibre")) {
      patch.longDescription = `${patch.longDescription || doc.longDescription || ""}\n${content.careHtml}`;
    }
    if (content.features) patch.features = content.features;
    if (PRODUCT_H1_OVERRIDES[slug]) patch.name = PRODUCT_H1_OVERRIDES[slug];

    // Aqua body kit year conflict → 2012–2015
    if (slug === "toyota-aqua-2012-2015-complete-body-kit") {
      // Leave structured fitment to code/review; stamp FAQ-ish copy years in description if present
      const ld = String(patch.longDescription || doc.longDescription || "");
      if (/2012\s*[–-]\s*26|2012-2026/i.test(ld)) {
        patch.longDescription = ld.replace(/2012\s*[–-]\s*26/gi, "2012–2015").replace(/2012-2026/gi, "2012–2015");
      }
    }

    const fieldDiffs = [];
    if (patch.name !== undefined) fieldDiffs.push(diff("name", before.name, patch.name));
    if (patch.metaTitle !== undefined) fieldDiffs.push(diff("metaTitle", before.metaTitle, patch.metaTitle));
    if (patch.metaDescription !== undefined) {
      fieldDiffs.push(diff("metaDescription", before.metaDescription, patch.metaDescription));
    }
    if (patch.shortDescription !== undefined) {
      fieldDiffs.push(diff("shortDescription", before.shortDescription, patch.shortDescription));
    }
    if (patch.longDescription !== undefined) {
      fieldDiffs.push(diff("longDescription", before.longDescription?.slice?.(0, 120), String(patch.longDescription).slice(0, 120)));
    }
    const real = fieldDiffs.filter(Boolean);
    if (!real.length) continue;

    console.log(`\n[product] /${slug}`);
    for (const d of real) console.log(`  ${d.field}: ${JSON.stringify(d.before)} → ${JSON.stringify(d.after)}`);
    changes.push({ type: "product", slug, diffs: real });
    backup.products.push({ _id: String(doc._id), slug, before });

    if (!DRY_RUN) {
      await products.updateOne({ _id: doc._id }, { $set: patch });
    }
  }

  // --- Categories ---
  for (const [pathKey, seo] of Object.entries(PAGE_SEO_OVERRIDES)) {
    if (!pathKey.startsWith("/categories/")) continue;
    const slug = pathKey.replace("/categories/", "");
    if (CATEGORY_APPLY_SKIP.has(slug)) {
      console.log(`[skip] category ${slug} (owner-locked)`);
      continue;
    }
    const doc = await categories.findOne({ slug });
    if (!doc) {
      console.log(`[miss] category ${slug}`);
      continue;
    }
    const h1 = CATEGORY_H1_OVERRIDES[slug];
    const desc = CATEGORY_DESCRIPTION_HTML[slug];
    const before = {
      name: doc.name,
      metaTitle: doc.seo?.metaTitle || "",
      metaDescription: doc.seo?.metaDescription || "",
      description: doc.description || "",
    };
    const patch = {};
    if (seo.title) patch["seo.metaTitle"] = seo.title;
    if (seo.meta) patch["seo.metaDescription"] = seo.meta;
    if (h1) patch.name = h1;
    if (desc) patch.description = desc;

    const fieldDiffs = [
      diff("name", before.name, patch.name ?? before.name),
      diff("metaTitle", before.metaTitle, patch["seo.metaTitle"] ?? before.metaTitle),
      diff("metaDescription", before.metaDescription, patch["seo.metaDescription"] ?? before.metaDescription),
      diff("description", before.description?.slice?.(0, 80), (patch.description || before.description)?.slice?.(0, 80)),
    ].filter((d) => d && d.before !== d.after);

    if (!fieldDiffs.length) continue;
    console.log(`\n[category] /categories/${slug}`);
    for (const d of fieldDiffs) console.log(`  ${d.field}: ${JSON.stringify(d.before)} → ${JSON.stringify(d.after)}`);
    changes.push({ type: "category", slug, diffs: fieldDiffs });
    backup.categories.push({ _id: String(doc._id), slug, before });
    if (!DRY_RUN) await categories.updateOne({ _id: doc._id }, { $set: patch });
  }

  // --- Vehicles + car catalog descriptions ---
  for (const [pathKey, seo] of Object.entries(PAGE_SEO_OVERRIDES)) {
    if (!pathKey.startsWith("/cars/")) continue;
    const slug = pathKey.replace("/cars/", "");
    const doc = await vehicles.findOne({ slug });
    const catalog = await carCatalog.findOne({ slug }).catch(() => null);
    if (!doc && !catalog) {
      console.log(`[miss] vehicle ${slug}`);
      continue;
    }
    const html = VEHICLE_DESCRIPTION_HTML[slug];
    let plainIntro = html
      ? String(html)
          .replace(/<h2[\s\S]*$/i, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
      : "";

    // E140: collapse duplicated intro if present
    if (slug === "toyota-corolla-e140-2009-2014" && doc?.description) {
      const parts = String(doc.description).split(/\n\n+/);
      if (parts.length >= 2 && parts[0].trim() === parts[1].trim()) {
        plainIntro = parts[0].trim();
      }
    }

    const before = {
      metaTitle: doc?.metaTitle || "",
      metaDescription: doc?.metaDescription || "",
      description: doc?.description || catalog?.description || "",
    };
    const patchVehicle = {};
    const patchCatalog = {};
    if (seo.title && !pathKey.includes("toyota-corolla-e140")) patchVehicle.metaTitle = seo.title;
    if (seo.meta) {
      patchVehicle.metaDescription = seo.meta;
      patchCatalog.metaDescription = seo.meta;
    }
    if (html) {
      patchVehicle.description = html;
      patchCatalog.description = html;
    } else if (plainIntro) {
      patchVehicle.description = plainIntro;
    }

    console.log(`\n[vehicle] /cars/${slug}`);
    if (seo.title) console.log(`  metaTitle → ${seo.title}`);
    if (seo.meta) console.log(`  metaDescription → ${seo.meta}`);
    if (html) console.log(`  description → (html ${html.length} chars)`);
    changes.push({ type: "vehicle", slug });
    if (doc) backup.vehicles.push({ _id: String(doc._id), slug, before });
    if (catalog) backup.carCatalog.push({ _id: String(catalog._id), slug, before: { description: catalog.description } });

    if (!DRY_RUN) {
      if (doc && Object.keys(patchVehicle).length) {
        await vehicles.updateOne({ _id: doc._id }, { $set: patchVehicle });
      }
      if (catalog && Object.keys(patchCatalog).length) {
        await carCatalog.updateOne({ _id: catalog._id }, { $set: patchCatalog });
      }
    }
  }

  if (!DRY_RUN) {
    fs.writeFileSync(BACKUP_PATH, JSON.stringify(backup, null, 2));
    console.log(`\nBackup written: ${BACKUP_PATH}`);
  }

  console.log(`\nDone. ${changes.length} documents with changes. ${DRY_RUN ? "Dry run only." : "Writes applied."}`);
  if (DRY_RUN) {
    console.log(
      "\nReal run command:\n  cd /Users/mac/Desktop/CCSMS && node --env-file=storecraft-store/.env.local scripts/seo/apply-seo-2026-10.mjs --apply --allow-write\n(Add --i-know-this-is-staging only after confirming the URI is staging/production intentionally.)"
    );
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
