#!/usr/bin/env node
/**
 * Catalog clean-up from the 2026-10-30 audit (issues.csv). Idempotent: run it again and
 * only what is still wrong shows up.
 *
 * What it changes (only what can be derived from the data — never invents prices or photos):
 *   1. Prices with float noise → whole rupees (5999.03 → 5999, 47999.98 → 48000).
 *   2. Fitment rows whose model is a generation code → Car Catalog model + generation
 *      ("E170–E210" → Corolla / E170–E210), in vehicleCompatibility and compatibleCars,
 *      plus links to the matching car pages (added, never removed).
 *   3. Four products whose fitment names a different car than title + photo (audit "high").
 *   4. Category moves for products filed under an unrelated category.
 * Everything else goes to NEEDS_HUMAN_REVIEW.md.
 *
 * Dry run (default) — from JSON exports (admin /api/products, /api/car-catalog,
 * /api/categories, app /api/mobile/v1/vehicles) or read-only from a DB:
 *   node --import ./tests/alias-loader.mjs scripts/fix-catalog-2026-10.mjs \
 *     --products p.json --catalog cc.json --categories cats.json --vehicles v.json
 *   MONGODB_URI=… node --import ./tests/alias-loader.mjs scripts/fix-catalog-2026-10.mjs
 * Apply (live DB only, fingerprint-checked, backup written first):
 *   MONGODB_URI=… node --import ./tests/alias-loader.mjs scripts/fix-catalog-2026-10.mjs --apply --allow-write
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { catalogModelsByMake, normalizeFitmentModel } from "../storecraft-admin/lib/fitmentModelNormalize.js";
import { matchCompatibleVehicleIds } from "../storecraft-admin/lib/syncCompatibleVehicles.js";
import { LIVE_URI_FINGERPRINT, assertLiveWriteFingerprint } from "./mongo/prodFingerprint.mjs";
import { runCatalogChecks, skuOf } from "./catalog/catalogChecks.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "seo-reports/catalog-fix-2026-10");
const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const APPLY = args.includes("--apply") && args.includes("--allow-write");
const lower = (s) => String(s || "").trim().toLowerCase();

/** Audit "high": title and photo agree on the car, the fitment names another one. */
export const FITMENT_FIXES = {
  "CC-0012": { make: "Suzuki", model: "Alto", yearFrom: 2018, yearTo: 2023, why: "Alto steering buttons (photo checked) listed for Toyota Corolla" },
  "CC-EXT-106": { make: "Toyota", model: "Corolla", yearFrom: 2012, yearTo: 2014, why: "Corolla headlights listed for Honda City" },
  "CC-EXT-107": { make: "Honda", model: "Civic", yearFrom: 2016, yearTo: 2021, why: "Civic grille listed for Toyota Aqua" },
  "CC-INT-122": { make: "Hyundai", model: "Tucson", yearFrom: 2020, yearTo: 2024, why: "Tucson dashboard mat listed for Elantra" },
};

/** Category slugs to add / remove (only clearly unrelated categories are removed). */
export const CATEGORY_FIXES = {
  "CC-0060": { add: ["splitters-side-skirts"], remove: [], why: "front splitter had no category" },
  "CC-0015": { add: ["led-indicator-lights"], remove: ["multimedia-steering-controls"], why: "mirror indicator under steering controls" },
  "CC-0021": { add: ["steering-wheel-covers"], remove: ["car-care-cleaning"], why: "steering wheel cover under car care" },
  "CC-0157": { add: [], remove: ["splitters-side-skirts"], why: "steering trim under splitters" },
  "CC-0162": { add: ["spoilers-diffusers"], remove: ["splitters-side-skirts"], why: "trunk spoiler under splitters" },
  "CC-ALT-EXT-TL-LAV-SMK-1": { add: ["backlights-tail-lamps"], remove: ["led-indicator-lights"], why: "tail lights under indicators" },
  "CC-HCX-INT-STC-CF": { add: [], remove: ["quarter-window-louvers", "side-mirror-covers"], why: "steering trim under louvers / mirror covers" },
};

function readList(file, keys) {
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  if (Array.isArray(j)) return j;
  for (const k of keys) {
    const v = k.split(".").reduce((o, p) => o?.[p], j);
    if (Array.isArray(v)) return v;
  }
  throw new Error(`No list in ${file}`);
}

async function loadData() {
  if (arg("--products")) {
    return {
      source: "json",
      products: readList(arg("--products"), ["products", "data.products", "data"]),
      catalogMakes: readList(arg("--catalog"), ["makes", "data.makes"]),
      categories: readList(arg("--categories"), ["categories", "data"]),
      vehicles: readList(arg("--vehicles"), ["vehicles", "data.vehicles", "data"]).map((v) => ({
        _id: v._id || v.id,
        make: v.make,
        model: v.model,
        yearFrom: v.yearFrom ?? v.yearStart,
        yearTo: v.yearTo ?? v.yearEnd,
        isActive: v.isActive,
      })),
    };
  }
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("Pass JSON exports (--products …) or set MONGODB_URI.");
  const fingerprint = crypto.createHash("sha256").update(uri).digest("hex").slice(0, 16);
  if (APPLY) {
    const ok = assertLiveWriteFingerprint(fingerprint);
    if (!ok.ok) throw new Error(`Refusing to write: ${ok.reason} (expected live FP ${LIVE_URI_FINGERPRINT}).`);
  }
  const require = createRequire(path.join(ROOT, "storecraft-admin/package.json"));
  const mongoose = require("mongoose");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  return {
    source: `db ${fingerprint}`,
    mongoose,
    db,
    products: await db.collection("products").find({}).toArray(),
    catalogMakes: await db.collection("carcatalogs").find({}, { projection: { name: 1, models: 1 } }).toArray(),
    categories: await db.collection("categories").find({}, { projection: { slug: 1, name: 1 } }).toArray(),
    vehicles: await db.collection("vehicles").find({ isActive: { $ne: false } }, { projection: { make: 1, model: 1, yearFrom: 1, yearTo: 1 } }).toArray(),
  };
}

function wholeRupees(n) {
  const x = Number(n);
  return Number.isFinite(x) && !Number.isInteger(x) ? Math.round(x) : null;
}

/** Build the change list for one product. */
export function planProduct(p, ctx) {
  const sku = skuOf(p);
  const changes = [];
  const set = {};
  const review = [];

  // 1. Prices.
  const regular = Number(p.pricing?.regularPrice);
  const sale = p.pricing?.salePrice == null ? null : Number(p.pricing.salePrice);
  const newRegular = wholeRupees(regular) ?? regular;
  const newSale = sale == null ? null : wholeRupees(sale) ?? sale;
  if (newRegular !== regular) {
    set["pricing.regularPrice"] = newRegular;
    changes.push({ field: "pricing.regularPrice", before: regular, after: newRegular, why: "float noise" });
  }
  if (newSale !== sale && newSale != null) {
    if (newSale > 0 && newSale >= newRegular) {
      review.push(`salePrice ${sale} would round to ${newSale} ≥ regular ${newRegular}`);
    } else {
      set["pricing.salePrice"] = newSale;
      changes.push({ field: "pricing.salePrice", before: sale, after: newSale, why: "float noise" });
    }
  }

  // 2 + 3. Fitment.
  const vc = p.vehicleCompatibility || {};
  let rows = Array.isArray(vc.vehicles) ? vc.vehicles.map((r) => ({ ...r })) : [];
  let fitChanged = false;
  let replaceLinks = false;
  const fix = FITMENT_FIXES[sku];
  if (fix && rows.length && !rows.some((r) => lower(r.make) === lower(fix.make) && lower(r.model) === lower(fix.model))) {
    const before = rows.map((r) => `${r.make} ${r.model} ${r.yearFrom ?? ""}-${r.yearTo ?? ""}`).join("; ");
    rows = [{ make: fix.make, model: fix.model, yearFrom: fix.yearFrom, yearTo: fix.yearTo, bodyStyle: rows[0]?.bodyStyle || "All", notes: "" }];
    changes.push({ field: "fitment", before, after: `${fix.make} ${fix.model} ${fix.yearFrom}-${fix.yearTo}`, why: fix.why });
    fitChanged = true;
    replaceLinks = true;
  }
  rows = rows.map((r) => {
    const res = normalizeFitmentModel(r, ctx.byMake.get(lower(r.make)) || []);
    if (!res.changed) return r;
    fitChanged = true;
    changes.push({ field: "fitment.model", before: `${r.make} ${r.model}`, after: `${r.make} ${res.model} (${res.generation})`, why: "generation code in model field" });
    return { ...r, model: res.model, generationLabel: r.generationLabel || res.generation, generationId: r.generationId || res.generationId };
  });
  if (fix || fitChanged) {
    // Fill in the catalog generation for fixed rows that still lack one.
    rows = rows.map((r) => {
      if (r.generationId) return r;
      const m = (ctx.byMake.get(lower(r.make)) || []).filter(
        (e) => lower(e.name) === lower(r.model) && Math.max(Number(r.yearFrom) || 0, Number(e.yearFrom) || 0) <= Math.min(Number(r.yearTo) || 9999, Number(e.yearTo) || 9999)
      );
      return m.length === 1 ? { ...r, generationId: String(m[0]._id), generationLabel: r.generationLabel || m[0].generation || "" } : r;
    });
  }
  if (fitChanged) {
    set["vehicleCompatibility.vehicles"] = rows;
    if ((vc.fitmentType || "specific") !== "universal") {
      set.compatibleCars = rows.map((r) => ({
        make: r.make,
        model: r.model,
        generation: r.generationLabel || "",
        generationId: r.generationId || null,
        generationLabel: r.generationLabel || "",
        yearFrom: r.yearFrom ?? null,
        yearTo: r.yearTo ?? null,
      }));
    }
    const resolved = matchCompatibleVehicleIds(rows, ctx.vehicles).map(String);
    const existing = (p.compatibleVehicles || []).map(String);
    const links = replaceLinks ? resolved : [...new Set([...existing, ...resolved])];
    if (links.join() !== existing.join()) {
      set.compatibleVehicles = links;
      changes.push({
        field: "compatibleVehicles",
        before: existing.length ? existing.map((id) => ctx.vehicleName.get(id) || id).join("; ") : "(none)",
        after: links.map((id) => ctx.vehicleName.get(id) || id).join("; ") || "(none)",
        why: replaceLinks ? "car pages for the corrected car" : "car pages for the normalised model (added only)",
      });
    }
  }

  // 4. Categories.
  const cat = CATEGORY_FIXES[sku];
  if (cat) {
    const current = (p.categories || []).map((c) => String(c?._id || c));
    const removeIds = cat.remove.map((s) => ctx.catBySlug.get(s)).filter(Boolean);
    const addIds = cat.add.map((s) => ctx.catBySlug.get(s)).filter(Boolean);
    const next = [...new Set([...current.filter((id) => !removeIds.includes(id)), ...addIds])];
    if (next.join() !== current.join()) {
      set.categories = next;
      changes.push({
        field: "categories",
        before: current.map((id) => ctx.catSlug.get(id) || id).join(", ") || "(none)",
        after: next.map((id) => ctx.catSlug.get(id) || id).join(", "),
        why: cat.why,
      });
    }
    for (const s of [...cat.add, ...cat.remove]) if (!ctx.catBySlug.has(s)) review.push(`category slug "${s}" not found`);
  }

  return { _id: String(p._id), sku, slug: p.slug, name: p.name, changes, set, review };
}

function fmt(v) {
  return typeof v === "string" ? v : JSON.stringify(v);
}

function writeDryRun(plans, data) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const changed = plans.filter((p) => p.changes.length);
  const byField = {};
  for (const p of changed) for (const c of p.changes) byField[c.field] = (byField[c.field] || 0) + 1;
  const lines = [
    "# Catalog fix 2026-10 — dry run",
    "",
    `Source: ${data.source} · ${data.products.length} products · generated ${new Date().toISOString()}`,
    "",
    `**${changed.length} products would change.** ${Object.entries(byField).map(([f, n]) => `${f}: ${n}`).join(" · ")}`,
    "",
    "| SKU | Field | Before | After | Why |",
    "|---|---|---|---|---|",
  ];
  for (const p of changed) {
    for (const c of p.changes) {
      lines.push(`| ${p.sku} | ${c.field} | ${fmt(c.before).replace(/\|/g, "/")} | ${fmt(c.after).replace(/\|/g, "/")} | ${c.why} |`);
    }
  }
  fs.writeFileSync(path.join(OUT_DIR, "DRY-RUN.md"), lines.join("\n") + "\n");
  fs.writeFileSync(path.join(OUT_DIR, "plan.json"), JSON.stringify(changed.map(({ _id, sku, slug, set }) => ({ _id, sku, slug, set })), null, 2));
  return { changed, byField };
}

async function main() {
  const data = await loadData();
  const ctx = {
    byMake: catalogModelsByMake(data.catalogMakes),
    vehicles: data.vehicles,
    vehicleName: new Map(data.vehicles.map((v) => [String(v._id), `${v.make} ${v.model} ${v.yearFrom ?? ""}-${v.yearTo ?? ""}`])),
    catBySlug: new Map(data.categories.map((c) => [c.slug, String(c._id)])),
    catSlug: new Map(data.categories.map((c) => [String(c._id), c.slug])),
  };
  const plans = data.products.map((p) => planProduct(p, ctx));
  const { changed, byField } = writeDryRun(plans, data);
  console.log(`${changed.length} products would change:`, byField);
  console.log(`Wrote ${path.relative(ROOT, OUT_DIR)}/DRY-RUN.md and plan.json`);
  const remaining = runCatalogChecks(data).length;
  console.log(`Catalog checks before fix: ${remaining} issues (see scripts/catalog/check-catalog.mjs)`);
  for (const p of plans) for (const r of p.review) console.log(`REVIEW ${p.sku}: ${r}`);

  if (!APPLY) {
    console.log("Dry run only. Apply with --apply --allow-write against the live DB.");
    if (data.mongoose) await data.mongoose.disconnect();
    return;
  }
  if (!data.db) throw new Error("--apply needs MONGODB_URI (JSON exports are read-only).");

  const { ObjectId } = data.mongoose.Types;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backup = changed.map((p) => {
    const doc = data.products.find((d) => String(d._id) === p._id);
    return { _id: p._id, sku: p.sku, before: Object.fromEntries(Object.keys(p.set).map((k) => [k, k.split(".").reduce((o, x) => o?.[x], doc)])) };
  });
  const backupFile = path.join(OUT_DIR, `backup-before-apply-${stamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
  console.log(`Backup of previous values: ${path.relative(ROOT, backupFile)}`);

  let n = 0;
  for (const p of changed) {
    const $set = { ...p.set, updatedAt: new Date() };
    if ($set.categories) $set.categories = $set.categories.map((id) => new ObjectId(id));
    if ($set.compatibleVehicles) $set.compatibleVehicles = $set.compatibleVehicles.map((id) => new ObjectId(id));
    for (const key of ["vehicleCompatibility.vehicles", "compatibleCars"]) {
      if ($set[key]) $set[key] = $set[key].map((r) => ({ ...r, generationId: r.generationId ? new ObjectId(String(r.generationId)) : null }));
    }
    const res = await data.db.collection("products").updateOne({ _id: new ObjectId(p._id) }, { $set });
    n += res.modifiedCount;
  }
  console.log(`Applied: ${n} products updated. Re-run without --apply to confirm nothing is left.`);
  await data.mongoose.disconnect();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e) => {
    console.error(e.message || e);
    process.exit(2);
  });
}
