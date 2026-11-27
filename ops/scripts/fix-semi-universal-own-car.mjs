#!/usr/bin/env node
/**
 * Repair products imported as "semi-universal" whose listed vehicles are the car the
 * listing is FOR (import-handoff-r3, import-console-batch08, import-osram-v1-batch10).
 *
 * "semi-universal" means "fits most cars EXCEPT these", so the product page showed e.g.
 * "⚡ Fits Most Cars — Exceptions: BYD Atto 2" on the BYD Atto 2 console organiser, and
 * the product lost its isAccessoryOrSparePartFor schema. Found on 312 live products
 * (site audit, 27 Nov 2026).
 *
 * A product is repaired only when EVERY vehicle in vehicleCompatibility.vehicles is also
 * one of its own compatibleCars / compatibleVehicles (the importers' pattern). Genuine
 * semi-universal products list exceptions that are not their own cars, so they are left alone.
 *
 * Usage (store container, production DB):
 *   node ops/scripts/fix-semi-universal-own-car.mjs                 # dry run, writes nothing
 *   node ops/scripts/fix-semi-universal-own-car.mjs --apply         # backup, then update
 *   node ops/scripts/fix-semi-universal-own-car.mjs --restore=<backup.json>
 * Options: --out=<dir> (default ./fix-semi-universal-out)
 *
 * Product pages pick the change up within 5 minutes (ISR revalidate = 300s).
 */
import fs from "fs";
import path from "path";

const LIVE_DB = "crazzycars_motorsports";

function arg(name, fallback = "") {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}
const hasFlag = (name) => process.argv.includes(`--${name}`);

function dbNameFromUri(uri) {
  try {
    const u = new URL(uri.replace(/^mongodb(\+srv)?:\/\//, "http://"));
    return decodeURIComponent((u.pathname || "").replace(/^\//, "").split("/")[0] || "");
  } catch {
    return "";
  }
}

const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

/** True when every listed "exception" is one of the product's own cars. */
export function exceptionsAreOwnCars(p) {
  const vc = p?.vehicleCompatibility;
  if (!vc || vc.fitmentType !== "semi-universal") return false;
  const listed = Array.isArray(vc.vehicles) ? vc.vehicles.filter((v) => v && (v.make || v.model)) : [];
  if (!listed.length) return false;
  const ownCars = Array.isArray(p.compatibleCars) ? p.compatibleCars : [];
  const ownIds = new Set(
    (Array.isArray(p.compatibleVehicles) ? p.compatibleVehicles : []).map((id) => String(id))
  );
  if (!ownCars.length && !ownIds.size) return false;
  return listed.every(
    (v) =>
      (v.generationId && ownIds.has(String(v.generationId))) ||
      ownCars.some((c) => norm(c?.make) === norm(v.make) && norm(c?.model) === norm(v.model))
  );
}

/** $set for one product: specific fitment; stored `fitment` rebuilt if it says universal. */
export function repairSet(p) {
  const vc = p.vehicleCompatibility;
  const set = { "vehicleCompatibility.fitmentType": "specific", isUniversal: false };
  if (p.fitment && typeof p.fitment === "object" && p.fitment.universal) {
    set.fitment = {
      universal: false,
      fits: vc.vehicles.map((v) => ({
        make: v.make,
        model: v.model,
        ...(v.yearFrom != null ? { yearFrom: v.yearFrom } : {}),
        ...(v.yearTo != null ? { yearTo: v.yearTo } : {}),
        ...(v.trim ? { trim: v.trim } : {}),
      })),
      doesNotFit: [],
      fitmentNote: p.fitment.fitmentNote || vc.universalNote || null,
    };
  }
  return set;
}

async function main() {
  // Loaded here so the pure helpers above can be unit-tested without a DB driver.
  const mongoose = (await import("mongoose")).default;
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || "";
  if (!uri) {
    console.error("Set MONGODB_URI");
    process.exit(2);
  }
  if (dbNameFromUri(uri) && dbNameFromUri(uri) !== LIVE_DB) {
    console.error(`REFUSE DB ${dbNameFromUri(uri)} (expected ${LIVE_DB})`);
    process.exit(2);
  }
  const outDir = arg("out", path.resolve("fix-semi-universal-out"));
  const restore = arg("restore");
  const apply = hasFlag("apply");

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (db.databaseName !== LIVE_DB) {
    console.error(`REFUSE connected ${db.databaseName}`);
    process.exit(2);
  }
  const Product = db.collection("products");

  try {
    if (restore) {
      const rows = JSON.parse(fs.readFileSync(restore, "utf8"));
      let n = 0;
      for (const r of rows) {
        const set = { vehicleCompatibility: r.vehicleCompatibility, isUniversal: r.isUniversal ?? false };
        const update = r.fitment === undefined ? { $set: set, $unset: { fitment: "" } } : { $set: { ...set, fitment: r.fitment } };
        const res = await Product.updateOne({ _id: new mongoose.Types.ObjectId(r._id) }, update);
        n += res.modifiedCount;
      }
      console.log(`RESTORED ${n} of ${rows.length} products from ${restore}`);
      return;
    }

    const candidates = await Product.find({ "vehicleCompatibility.fitmentType": "semi-universal" })
      .project({ name: 1, slug: 1, importKey: 1, isUniversal: 1, fitment: 1, vehicleCompatibility: 1, compatibleCars: 1, compatibleVehicles: 1 })
      .toArray();
    const fix = candidates.filter(exceptionsAreOwnCars);
    const keep = candidates.filter((p) => !exceptionsAreOwnCars(p));

    const byKey = {};
    for (const p of fix) {
      const k = String(p.importKey || "(no importKey)").split(":")[0];
      byKey[k] = (byKey[k] || 0) + 1;
    }
    console.log(`semi-universal products: ${candidates.length}`);
    console.log(`  to repair (exceptions = own car): ${fix.length}`, byKey);
    console.log(`  left alone (real exceptions): ${keep.length}`);
    for (const p of fix.slice(0, 8)) {
      const cars = p.vehicleCompatibility.vehicles.map((v) => `${v.make} ${v.model}`).join(", ");
      console.log(`    /${p.slug}  [${cars}]${p.fitment?.universal ? "  +stored fitment rebuilt" : ""}`);
    }
    for (const p of keep.slice(0, 5)) console.log(`    keep /${p.slug}`);

    if (!apply) {
      console.log("\nDRY RUN — nothing written. Re-run with --apply.");
      return;
    }

    fs.mkdirSync(outDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backup = path.join(outDir, `backup-${stamp}.json`);
    fs.writeFileSync(
      backup,
      JSON.stringify(
        fix.map((p) => ({
          _id: String(p._id),
          slug: p.slug,
          isUniversal: p.isUniversal,
          fitment: p.fitment,
          vehicleCompatibility: p.vehicleCompatibility,
        })),
        null,
        2
      )
    );
    console.log(`backup: ${backup}`);

    let modified = 0;
    for (const p of fix) {
      const res = await Product.updateOne(
        { _id: p._id, "vehicleCompatibility.fitmentType": "semi-universal" },
        { $set: { ...repairSet(p), updatedAt: new Date() } }
      );
      modified += res.modifiedCount;
    }
    console.log(`APPLIED: ${modified} of ${fix.length} products set to specific fitment.`);
    console.log(`Undo: node ops/scripts/fix-semi-universal-own-car.mjs --restore=${backup}`);
  } finally {
    await mongoose.disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
