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
 * Dry-run also writes: seo-backup-dry-run-2026-10.json (current values only).
 */
import crypto from "node:crypto";
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
const DRY_BACKUP_PATH = path.join(ROOT, "seo-backup-dry-run-2026-10.json");
const require = createRequire(path.join(ROOT, "storecraft-store/package.json"));
const mongoose = require("mongoose");

const argv = new Set(process.argv.slice(2));
const DRY_RUN = !argv.has("--apply");
const ALLOW_WRITE = argv.has("--allow-write");
const FORCE_STAGING_ACK = argv.has("--i-know-this-is-staging");

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || "";
const PROD_FP = "84143ac0cb2c3085";
const ATLAS_FP = "317ae4de8eb24f84";

function uriFingerprint(uri) {
  return crypto.createHash("sha256").update(String(uri || "")).digest("hex").slice(0, 16);
}

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

function redactUri(uri) {
  return String(uri || "").replace(/:([^:@/]+)@/, ":***@");
}

async function main() {
  if (!MONGO_URI) {
    console.error("Set MONGO_URI or MONGODB_URI (e.g. --env-file=storecraft-store/.env.local).");
    process.exit(1);
  }

  const fp = uriFingerprint(MONGO_URI);
  console.log(`URI (redacted): ${redactUri(MONGO_URI)}`);
  console.log(`DATABASE_FINGERPRINT: ${fp}`);
  console.log(`Expected prod: ${PROD_FP} | Legacy Atlas (do not write): ${ATLAS_FP}`);
  if (fp === ATLAS_FP) {
    console.log("WARNING: This is legacy Atlas (317ae4de8eb24f84), NOT production sialkot-mongo.");
  } else if (fp === PROD_FP) {
    console.log("OK: Production sialkot-mongo fingerprint matched.");
  } else {
    console.log("WARNING: Fingerprint does not match known prod or Atlas values.");
  }

  if (!DRY_RUN) {
    if (!ALLOW_WRITE) {
      console.error("Refusing write: pass --allow-write with --apply.");
      process.exit(1);
    }
    if (fp === ATLAS_FP) {
      console.error("Refusing write to legacy Atlas (317ae4de8eb24f84). Use production sialkot-mongo only.");
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

  const backup = {
    createdAt: new Date().toISOString(),
    fingerprint: fp,
    uriHint: redactUri(MONGO_URI),
    products: [],
    categories: [],
    vehicles: [],
    carCatalog: [],
  };
  const changes = [];
  const missing = [];

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
      missing.push({ type: "product", slug });
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
      imageAlts: (Array.isArray(doc.media?.images) ? doc.media.images : [])
        .map((im) => (typeof im === "string" ? "" : String(im?.altText || im?.alt || "")))
        .filter(Boolean),
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
    // descriptionHtml stays code-only (ProductDetailMedico) — do not overwrite Mongo longDescription.
    if (content.appendDescription && !String(doc.longDescription || "").includes(content.appendDescription.slice(0, 40))) {
      patch.longDescription = `${doc.longDescription || ""}\n<p>${content.appendDescription}</p>`;
    }
    // AC panel: fix Butto typo inside existing longDescription without replacing the full body
    if (slug === "toyota-corolla-2012-top-ac-panel") {
      const ld = String(patch.longDescription || doc.longDescription || "");
      if (/\bButto\b/.test(ld)) {
        patch.longDescription = ld.replace(/\bButto\b/g, "Button");
      }
    }
    if (content.careHtml && !String(doc.longDescription || "").includes("microfibre")) {
      patch.longDescription = `${patch.longDescription || doc.longDescription || ""}\n${content.careHtml}`;
    }
    if (content.features) patch.features = content.features;
    if (PRODUCT_H1_OVERRIDES[slug]) patch.name = PRODUCT_H1_OVERRIDES[slug];

    // Image alts (AC panel Butto→Button and any imageAlt override)
    if (content.imageAlt && Array.isArray(doc.media?.images) && doc.media.images.length) {
      const nextImages = doc.media.images.map((im) => {
        if (typeof im === "string") return { url: im, altText: content.imageAlt };
        return { ...im, altText: content.imageAlt, alt: content.imageAlt };
      });
      const beforeAlts = before.imageAlts.join(" | ");
      const afterAlts = nextImages
        .map((im) => String(im.altText || im.alt || ""))
        .filter(Boolean)
        .join(" | ");
      if (beforeAlts !== afterAlts) {
        patch["media.images"] = nextImages;
      }
    } else if (slug === "toyota-corolla-2012-top-ac-panel" && Array.isArray(doc.media?.images)) {
      const nextImages = doc.media.images.map((im) => {
        if (typeof im === "string") return im;
        const alt = String(im?.altText || im?.alt || "");
        if (!/\bButto\b/.test(alt)) return im;
        const fixed = alt.replace(/\bButto\b/g, "Button");
        return { ...im, altText: fixed, alt: fixed };
      });
      if (JSON.stringify(nextImages) !== JSON.stringify(doc.media.images)) {
        patch["media.images"] = nextImages;
      }
    }

    // Aqua body kit year conflict → 2012–2015
    if (slug === "toyota-aqua-2012-2015-complete-body-kit") {
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
      fieldDiffs.push(
        diff(
          "longDescription",
          before.longDescription?.slice?.(0, 120),
          String(patch.longDescription).slice(0, 120)
        )
      );
    }
    if (patch.features !== undefined) {
      fieldDiffs.push(
        diff("features", JSON.stringify(before.features), JSON.stringify(patch.features))
      );
    }
    if (patch["media.images"] !== undefined) {
      const afterAlts = patch["media.images"]
        .map((im) => (typeof im === "string" ? "" : String(im.altText || im.alt || "")))
        .filter(Boolean)
        .join(" | ");
      fieldDiffs.push(diff("imageAlts", before.imageAlts.join(" | "), afterAlts));
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
      missing.push({ type: "category", slug });
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

  // --- Vehicles + car catalog (PAGE_SEO + any VEHICLE_DESCRIPTION_HTML-only slugs) ---
  const vehicleSlugs = new Set([
    ...Object.keys(PAGE_SEO_OVERRIDES)
      .filter((p) => p.startsWith("/cars/"))
      .map((p) => p.replace("/cars/", "")),
    ...Object.keys(VEHICLE_DESCRIPTION_HTML),
  ]);

  for (const slug of vehicleSlugs) {
    const pathKey = `/cars/${slug}`;
    const seo = PAGE_SEO_OVERRIDES[pathKey] || {};
    const doc = await vehicles.findOne({ slug });
    const catalog = await carCatalog.findOne({ slug }).catch(() => null);
    if (!doc && !catalog) {
      console.log(`[miss] vehicle ${slug}`);
      missing.push({ type: "vehicle", slug });
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

    const fieldDiffs = [
      seo.title && !pathKey.includes("toyota-corolla-e140")
        ? diff("metaTitle", before.metaTitle, seo.title)
        : null,
      seo.meta ? diff("metaDescription", before.metaDescription, seo.meta) : null,
      html
        ? diff(
            "description",
            String(before.description || "").slice(0, 100),
            String(html).slice(0, 100)
          )
        : null,
    ].filter(Boolean);

    if (!fieldDiffs.length) continue;

    console.log(`\n[vehicle] /cars/${slug}`);
    for (const d of fieldDiffs) {
      console.log(`  ${d.field}: ${JSON.stringify(d.before)} → ${JSON.stringify(d.after)}`);
    }
    changes.push({ type: "vehicle", slug, diffs: fieldDiffs });
    if (doc) backup.vehicles.push({ _id: String(doc._id), slug, before });
    if (catalog) {
      backup.carCatalog.push({
        _id: String(catalog._id),
        slug,
        before: { description: catalog.description },
      });
    }

    if (!DRY_RUN) {
      if (doc && Object.keys(patchVehicle).length) {
        await vehicles.updateOne({ _id: doc._id }, { $set: patchVehicle });
      }
      if (catalog && Object.keys(patchCatalog).length) {
        await carCatalog.updateOne({ _id: catalog._id }, { $set: patchCatalog });
      }
    }
  }

  // Persist a snapshot of docs that would change (dry-run safety net)
  const snapshotPath = DRY_RUN ? DRY_BACKUP_PATH : BACKUP_PATH;
  try {
    fs.writeFileSync(snapshotPath, JSON.stringify(backup, null, 2));
    console.log(`\nSnapshot written: ${snapshotPath}`);
  } catch (err) {
    const fallback = path.join("/tmp", path.basename(snapshotPath));
    fs.writeFileSync(fallback, JSON.stringify(backup, null, 2));
    console.log(`\nSnapshot written (fallback): ${fallback} (${err.code || err.message})`);
  }

  // Summary
  const byType = { product: 0, category: 0, vehicle: 0 };
  for (const c of changes) byType[c.type] = (byType[c.type] || 0) + 1;
  console.log("\n=== DIFF SUMMARY ===");
  console.log(`Fingerprint: ${fp}${fp === PROD_FP ? " (production OK)" : fp === ATLAS_FP ? " (LEGACY ATLAS — do not apply)" : ""}`);
  console.log(`Documents with changes: ${changes.length} (products=${byType.product}, categories=${byType.category}, vehicles=${byType.vehicle})`);
  console.log(`Missing slugs: ${missing.length}`);
  for (const m of missing) console.log(`  - ${m.type} ${m.slug}`);
  if (!missing.length) console.log("  (none)");
  console.log("Changed slugs:");
  for (const c of changes) {
    const fields = (c.diffs || []).map((d) => d.field).join(", ");
    console.log(`  - ${c.type} ${c.slug}${fields ? ` [${fields}]` : ""}`);
  }

  console.log(`\nDone. ${changes.length} documents with changes. ${DRY_RUN ? "Dry run only." : "Writes applied."}`);
  if (DRY_RUN) {
    console.log(
      "\nReal run command (VPS, production URI only):\n  MONGODB_URI='mongodb://sialkot-mongo:27017/sialkot_motorsports' node scripts/seo/apply-seo-2026-10.mjs --apply --allow-write --i-know-this-is-staging\n(Confirm fingerprint 84143ac0cb2c3085 first. Never use Atlas 317ae4de8eb24f84.)"
    );
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
