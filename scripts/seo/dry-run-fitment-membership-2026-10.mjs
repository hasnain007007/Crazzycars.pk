/**
 * PHASE A dry-run only — vehicle tags + category membership.
 * Run on VPS against sialkot-mongo. Never writes.
 *
 *   docker cp script.js sialkot-mongo:/tmp/dry.js
 *   docker exec sialkot-mongo mongosh sialkot_motorsports --quiet /tmp/dry.js
 *
 * Or via node + mongoose with MONGODB_URI=mongodb://sialkot-mongo:27017/sialkot_motorsports
 */
import crypto from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
// Prefer cwd (Coolify /app) then monorepo storecraft-store.
const require = createRequire(
  path.join(
    process.env.PWD || process.cwd() || ROOT,
    "package.json"
  )
);
let mongoose;
try {
  mongoose = require("mongoose");
} catch {
  mongoose = createRequire(path.join(ROOT, "storecraft-store/package.json"))("mongoose");
}

const PROD_FP = "84143ac0cb2c3085";
const ATLAS_FP = "317ae4de8eb24f84";
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || "";

function uriFingerprint(uri) {
  return crypto.createHash("sha256").update(String(uri || "")).digest("hex").slice(0, 16);
}

function yearsFromText(text) {
  const s = String(text || "");
  const m = s.match(/(20\d{2}|19\d{2})\s*[–\-]\s*(20\d{2}|19\d{2}|present)/i);
  if (m) {
    const from = Number(m[1]);
    const to = /present/i.test(m[2]) ? 9999 : Number(m[2]);
    return { from, to, raw: m[0] };
  }
  return null;
}

function overlap(aFrom, aTo, bFrom, bTo) {
  const A = Number(aFrom);
  const B = aTo == null || aTo === "" ? 9999 : Number(aTo);
  const C = Number(bFrom);
  const D = bTo == null || bTo === "" ? 9999 : Number(bTo);
  if (![A, B, C, D].every(Number.isFinite)) return false;
  return A <= D && C <= B;
}

async function main() {
  if (!MONGO_URI) {
    console.error("Set MONGODB_URI / MONGO_URI");
    process.exit(1);
  }
  const fp = uriFingerprint(MONGO_URI);
  console.log("URI (redacted):", String(MONGO_URI).replace(/:([^:@/]+)@/, ":***@"));
  console.log("DATABASE_FINGERPRINT:", fp);
  console.log("Expected prod:", PROD_FP, "| Atlas (do not use):", ATLAS_FP);
  if (fp === ATLAS_FP) {
    console.error("STOP: Atlas fingerprint — refusing.");
    process.exit(2);
  }
  if (fp !== PROD_FP) {
    console.error("STOP: fingerprint mismatch — refusing.");
    process.exit(2);
  }
  console.log("OK: Production sialkot-mongo fingerprint matched.");
  console.log("=== DRY RUN (no writes) ===");
  console.log(
    "Touch plan if GO: products.compatibleVehicles ($pull), products.categories ($pull / $addToSet only)."
  );
  console.log(
    "Never touched: pricing.*, price, inventory/stock, media/images, variants*, SEO fields (meta*, seo.*, descriptions)."
  );

  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const products = db.collection("products");
  const categories = db.collection("categories");
  const vehicles = db.collection("vehicles");

  console.log("\n=== FIELD DISCOVERY ===");
  const sample = await products.findOne(
    { status: "active" },
    {
      projection: {
        slug: 1,
        categories: 1,
        compatibleVehicles: 1,
        compatibleCars: 1,
        "vehicleCompatibility.vehicles": 1,
      },
    }
  );
  console.log("products.categories:", "ObjectId[] → categories._id");
  console.log("products.compatibleVehicles:", "ObjectId[] → vehicles._id (primary for /cars pages)");
  console.log(
    "products.compatibleCars / vehicleCompatibility.vehicles:",
    "legacy fitment rows (present; page filter prefers compatibleVehicles)"
  );
  console.log("carcatalogs.models[]:", "display/popular only — NOT product membership");
  console.log(
    "sample.categories[0]:",
    sample?.categories?.[0] ? String(sample.categories[0]) : null
  );
  console.log(
    "sample.compatibleVehicles[0]:",
    sample?.compatibleVehicles?.[0] ? String(sample.compatibleVehicles[0]) : null
  );

  const allVehicles = await vehicles
    .find({}, { projection: { slug: 1, displayName: 1, yearFrom: 1, yearTo: 1, make: 1, model: 1 } })
    .toArray();
  const vById = new Map(allVehicles.map((v) => [String(v._id), v]));
  const vBySlug = new Map(allVehicles.map((v) => [v.slug, v]));

  const allCats = await categories
    .find({}, { projection: { slug: 1, name: 1, status: 1 } })
    .toArray();
  const cById = new Map(allCats.map((c) => [String(c._id), c]));
  const cBySlug = new Map(allCats.map((c) => [c.slug, c]));

  function fmtVehicles(ids) {
    return (ids || []).map((id) => {
      const v = vById.get(String(id));
      if (!v) return { id: String(id), missing: true };
      return {
        id: String(id),
        slug: v.slug,
        name: v.displayName,
        years: `${v.yearFrom}–${v.yearTo ?? "present"}`,
      };
    });
  }
  function fmtCats(ids) {
    return (ids || []).map((id) => {
      const c = cById.get(String(id));
      if (!c) return { id: String(id), missing: true };
      return { id: String(id), slug: c.slug, name: c.name };
    });
  }

  async function findProduct(spec) {
    if (spec.slug) {
      const p = await products.findOne({ slug: spec.slug });
      if (p) return p;
    }
    if (spec.nameIncludes) {
      const rx = new RegExp(spec.nameIncludes.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      return products.findOne({ name: rx });
    }
    if (spec.slugIncludes) {
      const rx = new RegExp(spec.slugIncludes.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      return products.findOne({ slug: rx });
    }
    return null;
  }

  function reportProduct(label, p) {
    if (!p) {
      console.log(`\n--- ${label} ---`);
      console.log("NOT FOUND");
      return null;
    }
    console.log(`\n--- ${label} ---`);
    console.log("slug:", p.slug);
    console.log("name:", p.name);
    console.log("status:", p.status);
    console.log("vehicles:", JSON.stringify(fmtVehicles(p.compatibleVehicles), null, 0));
    console.log("categories:", JSON.stringify(fmtCats(p.categories), null, 0));
    return p;
  }

  let docsTouchedVehicle = 0;
  let docsTouchedCategory = 0;
  const touchSet = new Set();

  console.log("\n========== A. WRONG-GENERATION VEHICLE TAGS ==========");

  const e140 = vBySlug.get("toyota-corolla-e140-2009-2014");
  const e170 =
    vBySlug.get("toyota-corolla-e170-e210-2014-present") ||
    [...vBySlug.values()].find((v) => /e170|e210/i.test(v.slug || "") && /corolla/i.test(v.slug || ""));
  const civicX = vBySlug.get("honda-civic-x-2016-2021");
  const civicRebirth = vBySlug.get("honda-civic-rebirth-2012-2016");

  console.log("E140:", e140 ? `${e140.slug} (${e140._id})` : "MISSING");
  console.log("E170/E210:", e170 ? `${e170.slug} (${e170._id})` : "MISSING");
  console.log("Civic X:", civicX ? `${civicX.slug} (${civicX._id})` : "MISSING");
  console.log("Civic Rebirth:", civicRebirth ? `${civicRebirth.slug} (${civicRebirth._id})` : "MISSING");

  const vehicleRemovals = [
    {
      label: "Corolla X door handle panels 2014-2026",
      slug: "toyota-corolla-x-carbon-fiber-interior-door-handle-panels-2014-2026",
      removeVehicleSlug: "toyota-corolla-e140-2009-2014",
      mustKeepSlugHint: /e170|e210|2014/,
    },
    {
      label: "Corolla Carbon Fiber Dashboard Trim 3PCS 2014-2026",
      nameIncludes: "Dashboard Trim 3PCS 2014",
      slugIncludes: "dashboard-trim",
      removeVehicleSlug: "toyota-corolla-e140-2009-2014",
      mustKeepSlugHint: /e170|e210|2014/,
    },
    {
      label: "Civic Rebirth ducktail spoiler",
      slug: "honda-civic-rebirth-ducktail-spoiler",
      slugIncludes: "civic-rebirth-ducktail",
      removeVehicleSlug: "honda-civic-x-2016-2021",
      mustKeepSlugHint: /rebirth/,
    },
  ];

  for (const item of vehicleRemovals) {
    const p =
      (await findProduct({ slug: item.slug })) ||
      (await findProduct({ nameIncludes: item.nameIncludes })) ||
      (await findProduct({ slugIncludes: item.slugIncludes }));
    reportProduct(item.label, p);
    if (!p) continue;
    const removeV = vBySlug.get(item.removeVehicleSlug);
    const hasRemove = (p.compatibleVehicles || []).some((id) => String(id) === String(removeV?._id));
    const kept = fmtVehicles(p.compatibleVehicles).filter((v) => v.slug !== item.removeVehicleSlug);
    const keepOk = kept.some((v) => item.mustKeepSlugHint.test(v.slug || ""));
    console.log("PROPOSE: $pull compatibleVehicles", item.removeVehicleSlug, removeV ? String(removeV._id) : "?");
    console.log("  currently tagged for remove target?", hasRemove);
    console.log("  remaining after pull:", JSON.stringify(kept));
    console.log("  keep-correct check:", keepOk ? "OK has E170/Rebirth (or matching)" : "WARN — verify keep list");
    if (hasRemove) {
      docsTouchedVehicle += 1;
      touchSet.add(String(p._id));
    } else {
      console.log("  NO-OP: already not on that vehicle");
    }
  }

  console.log("\n========== B. CATEGORY MEMBERSHIP ==========");
  console.log(
    "Available related categories:",
    allCats
      .filter((c) =>
        /spoiler|diffuser|interior|trim|steering|emblem|monogram|carbon|mirror|louver|splitter|indicator/i.test(
          `${c.slug} ${c.name}`
        )
      )
      .map((c) => c.slug)
      .join(", ")
  );

  const categoryMoves = [
    {
      label: "E140 Ducktail Trunk Spoiler",
      nameIncludes: "Ducktail Trunk Spoiler",
      slugIncludes: "ducktail",
      removeCat: "splitters-side-skirts",
      suggestCat: "spoilers-diffusers",
    },
    {
      label: "Corolla 2015-2026 Carbon Steering Trim",
      nameIncludes: "Carbon Steering Trim",
      slugIncludes: "steering-trim",
      removeCat: "splitters-side-skirts",
      suggestCat: "interior-trims",
      suggestCatAlts: ["carbon-fiber-accessories", "steering-wheel-covers"],
    },
    {
      label: "Corolla X Shark Fin Style Lower Panel Diffuser",
      nameIncludes: "Shark Fin",
      slugIncludes: "shark-fin",
      removeCat: "splitters-side-skirts",
      suggestCat: "spoilers-diffusers",
    },
    {
      label: "Civic X Carbon Steering Trim Cover",
      nameIncludes: "Steering Trim Cover",
      slugIncludes: "steering-trim-cover",
      removeCat: "quarter-window-louvers",
      suggestCat: "interior-trims",
      suggestCatAlts: ["carbon-fiber-accessories"],
    },
    {
      label: "Civic X Back Mirror Rack Louver Fibreglass",
      nameIncludes: "Back Mirror Rack Louver",
      slugIncludes: "mirror-rack-louver",
      removeCat: "quarter-window-louvers",
      suggestCat: null, // keep in louvers? or propose — user said remove; need another category
      note: "Name says louver — may belong in quarter-window-louvers OR a mirror/exterior category; propose remove only if owner agrees it is not a quarter-window louver",
    },
    {
      label: "Corolla Steering Monogram",
      nameIncludes: "Steering Monogram",
      slugIncludes: "steering-monogram",
      removeCat: "steering-wheel-covers",
      suggestCat: "interior-trims",
      suggestCatAlts: ["carbon-fiber-accessories"],
    },
  ];

  for (const item of categoryMoves) {
    // Prefer products currently in the wrong category
    const wrongCat = cBySlug.get(item.removeCat);
    let p = null;
    if (item.slugIncludes || item.nameIncludes) {
      const rxSlug = item.slugIncludes
        ? new RegExp(item.slugIncludes.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
        : null;
      const rxName = item.nameIncludes
        ? new RegExp(item.nameIncludes.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
        : null;
      const q = { $and: [] };
      if (wrongCat) q.$and.push({ categories: wrongCat._id });
      if (rxSlug || rxName) {
        const or = [];
        if (rxSlug) or.push({ slug: rxSlug });
        if (rxName) or.push({ name: rxName });
        q.$and.push({ $or: or });
      }
      p = await products.findOne(q.$and.length ? q : {});
      if (!p) {
        p =
          (await findProduct({ slugIncludes: item.slugIncludes })) ||
          (await findProduct({ nameIncludes: item.nameIncludes }));
      }
    }
    reportProduct(item.label, p);
    if (!p) continue;
    const cats = fmtCats(p.categories);
    const inWrong = cats.some((c) => c.slug === item.removeCat);
    const suggest = item.suggestCat ? cBySlug.get(item.suggestCat) : null;
    const suggestAlt = (item.suggestCatAlts || [])
      .map((s) => cBySlug.get(s))
      .filter(Boolean);
    const remainingAfterPull = cats.filter((c) => c.slug !== item.removeCat);
    const wouldBeEmpty = inWrong && remainingAfterPull.length === 0;
    console.log("PROPOSE:");
    console.log("  $pull categories:", item.removeCat, wrongCat ? String(wrongCat._id) : "MISSING CAT");
    if (wouldBeEmpty) {
      if (suggest) {
        console.log(
          "  $addToSet categories:",
          item.suggestCat,
          String(suggest._id),
          "(required — would otherwise have zero categories)"
        );
      } else {
        console.log("  WARN: would have zero categories after pull — need owner suggestCat");
      }
    } else if (suggest && !cats.some((c) => c.slug === item.suggestCat)) {
      console.log(
        "  optional $addToSet:",
        item.suggestCat,
        suggest ? String(suggest._id) : "MISSING",
        "(already in:",
        remainingAfterPull.map((c) => c.slug).join(", ") || "none",
        ")"
      );
    } else {
      console.log(
        "  keep remaining categories:",
        remainingAfterPull.map((c) => c.slug).join(", ") || "(none)"
      );
    }
    if (suggestAlt.length) {
      console.log(
        "  alt suggestions:",
        suggestAlt.map((c) => c.slug).join(", ")
      );
    }
    if (item.note) console.log("  NOTE:", item.note);
    console.log("  currently in wrong cat?", inWrong);
    if (inWrong) {
      docsTouchedCategory += 1;
      touchSet.add(String(p._id));
    } else {
      console.log("  NO-OP for pull: not in", item.removeCat);
    }
  }

  console.log("\n--- B. led-indicator-lights: non-indicator LIST ONLY (no removal) ---");
  const ledCat = cBySlug.get("led-indicator-lights");
  const ledSuspects = [
    { label: "OSRAM Projector Lights", rx: /osram|projector/i },
    { label: "Universal Angel Wings LED", rx: /angel\s*wings/i },
    { label: "4-Color Switchback Fog LED H11", rx: /switchback|fog.*h11|h11.*fog/i },
    { label: "Reverse Bright Light Bulb W16W", rx: /reverse|w16w/i },
    { label: "Alto Lava Style Smoke Tail Lights", rx: /lava|tail\s*light/i },
  ];
  if (ledCat) {
    for (const s of ledSuspects) {
      const hits = await products
        .find(
          { categories: ledCat._id, $or: [{ name: s.rx }, { slug: s.rx }] },
          { projection: { slug: 1, name: 1, status: 1, categories: 1 } }
        )
        .toArray();
      console.log(`\n${s.label}: ${hits.length} hit(s) in led-indicator-lights`);
      for (const p of hits) {
        console.log(
          " ",
          p.slug,
          "|",
          p.name,
          "| cats:",
          fmtCats(p.categories)
            .map((c) => c.slug)
            .join(", ")
        );
      }
      if (!hits.length) {
        // find anywhere
        const anywhere = await products.findOne(
          { $or: [{ name: s.rx }, { slug: s.rx }] },
          { projection: { slug: 1, name: 1, categories: 1, status: 1 } }
        );
        if (anywhere) {
          console.log(
            "  (found elsewhere, NOT in led-indicator-lights):",
            anywhere.slug,
            "cats:",
            fmtCats(anywhere.categories)
              .map((c) => c.slug)
              .join(", ")
          );
        } else console.log("  not found in catalog");
      }
    }
  } else {
    console.log("led-indicator-lights category MISSING");
  }

  console.log("\n========== C. ACTIVE PRODUCTS WITH NO CATEGORY ==========");
  const noCat = await products
    .find(
      {
        status: { $regex: /^active$/i },
        securityHold: { $ne: true },
        $or: [{ categories: { $exists: false } }, { categories: null }, { categories: { $size: 0 } }],
      },
      { projection: { slug: 1, name: 1, status: 1, categories: 1, tags: 1 } }
    )
    .toArray();
  console.log("count:", noCat.length);
  for (const p of noCat) {
    const hint = String(p.name || p.slug || "");
    let suggest = "uncategorized — owner pick";
    if (/spoiler|diffuser|ducktail/i.test(hint)) suggest = "spoilers-diffusers";
    else if (/splitter|side.?skirt|lip/i.test(hint)) suggest = "splitters-side-skirts";
    else if (/louver/i.test(hint)) suggest = "quarter-window-louvers";
    else if (/indicator|mirror.*light/i.test(hint)) suggest = "led-indicator-lights";
    else if (/steering.*(cover|trim)|monogram/i.test(hint)) suggest = "interior-trims or steering-wheel-covers";
    else if (/mat|dashboard/i.test(hint)) suggest = "floor-mats or interior";
    else if (/led|light|drl|fog|tail|headlight/i.test(hint)) suggest = "led-lighting / child category";
    else if (/carbon/i.test(hint)) suggest = "carbon-fiber-accessories";
    console.log("-", p.slug, "|", p.name, "| suggest:", suggest, cBySlug.has(suggest.split(" ")[0]) ? "" : "");
  }

  console.log("\n========== D. GENERIC: name years vs vehicle years (report only) ==========");
  const mismatches = [];
  for (const v of allVehicles) {
    const linked = await products
      .find(
        {
          status: { $regex: /^active$/i },
          securityHold: { $ne: true },
          compatibleVehicles: v._id,
        },
        { projection: { slug: 1, name: 1 } }
      )
      .toArray();
    for (const p of linked) {
      const yr = yearsFromText(`${p.name} ${p.slug}`);
      if (!yr) continue;
      if (!overlap(yr.from, yr.to, v.yearFrom, v.yearTo)) {
        mismatches.push({
          vehicle: v.slug,
          vehicleYears: `${v.yearFrom}–${v.yearTo ?? "present"}`,
          product: p.slug,
          productYears: yr.raw,
          name: p.name,
        });
      }
    }
  }
  console.log("mismatch count:", mismatches.length);
  for (const m of mismatches) {
    console.log(
      `- vehicle=${m.vehicle} (${m.vehicleYears}) | product=${m.product} (name years ${m.productYears}) | ${m.name}`
    );
  }

  console.log("\n========== SUMMARY ==========");
  console.log("Documents that would change (vehicle $pull):", docsTouchedVehicle);
  console.log("Documents that would change (category $pull / maybe $addToSet):", docsTouchedCategory);
  console.log("Unique product docs touched:", touchSet.size);
  console.log("Active products with zero categories (report only, not auto-fixed):", noCat.length);
  console.log("Year-mismatch pairs (report only):", mismatches.length);
  console.log(
    "Fields that WOULD be written on GO: compatibleVehicles, categories only. NOT pricing/stock/images/variants/SEO."
  );

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
