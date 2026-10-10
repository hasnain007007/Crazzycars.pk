/* eslint-disable */
/**
 * Phase B apply — vehicle tags + category membership.
 * Requires: fingerprint already verified; mongodump done; dry-run gate passed.
 *
 * Usage:
 *   APPLY=0 mongosh ... /tmp/apply.js   # dry-run / verify expected list
 *   APPLY=1 mongosh ... /tmp/apply.js   # write
 */
(() => {
  const APPLY = String(typeof process !== "undefined" && process.env && process.env.APPLY
    ? process.env.APPLY
    : typeof APPLY_FLAG !== "undefined"
      ? APPLY_FLAG
      : "0") === "1";

  // mongosh: pass via --eval 'var APPLY_FLAG="1"' before loading, or set below.
  const DO_WRITE = typeof APPLY_FLAG !== "undefined" ? String(APPLY_FLAG) === "1" : false;

  print("MODE:", DO_WRITE ? "APPLY" : "DRY-RUN GATE");
  print("DB:", db.getName());

  const e140 = db.vehicles.findOne({ slug: "toyota-corolla-e140-2009-2014" });
  const e170 = db.vehicles.findOne({ slug: "toyota-corolla-e170-2014-2026" });
  const civicX = db.vehicles.findOne({ slug: "honda-civic-x-2016-2021" });
  const civicReborn = db.vehicles.findOne({ slug: "honda-civic-reborn-2006-2012" });
  const civicRebirth = db.vehicles.findOne({ slug: "honda-civic-rebirth-2012-2016" });

  const cat = (s) => db.categories.findOne({ slug: s });
  const splitters = cat("splitters-side-skirts");
  const spoilers = cat("spoilers-diffusers");
  const louvers = cat("quarter-window-louvers");
  const steeringCovers = cat("steering-wheel-covers");
  const monograms = cat("stickers-monograms-emblems");

  function must(x, label) {
    if (!x) throw new Error("MISSING " + label);
    return x;
  }
  must(e140, "e140");
  must(e170, "e170");
  must(civicX, "civicX");
  must(civicReborn, "civicReborn");
  must(civicRebirth, "civicRebirth");
  must(splitters, "splitters");
  must(spoilers, "spoilers");
  must(louvers, "louvers");
  must(steeringCovers, "steeringCovers");
  must(monograms, "monograms");

  // Extra confirm for Reborn pull
  const rebirthDucktail = db.products.findOne({ slug: "honda-civic-rebirth-ducktail-spoiler" });
  const rebornDucktail = db.products.findOne({ slug: "honda-civic-reborn-ducktail-spoiler" });
  const nameOk = /Rebirth 2012.?2016/i.test(rebirthDucktail?.name || "");
  const rebornExists = !!rebornDucktail && /^active$/i.test(rebornDucktail.status || "");
  print("Rebirth ducktail name:", rebirthDucktail?.name, "NAME_OK=", nameOk);
  print(
    "Reborn ducktail exists:",
    rebornExists,
    rebornDucktail ? rebornDucktail.slug + " | " + rebornDucktail.name : "NO"
  );
  const pullRebornFromRebirth = nameOk && rebornExists;
  if (!pullRebornFromRebirth) {
    print("SKIP: Civic Reborn $pull on rebirth ducktail (confirmation failed)");
  }

  /** Expected ops — abort if current state differs */
  const expectedOps = [
    {
      slug: "toyota-corolla-x-carbon-fiber-interior-door-handle-panels-2014-2026",
      kind: "vehicle_pull",
      vehicleId: e140._id,
      requireHas: [e140._id, e170._id],
    },
    {
      slug: "toyota-corolla-carbon-fiber-dashboard-trim-3pcs-lcd-2014-2026",
      kind: "vehicle_pull",
      vehicleId: e140._id,
      requireHas: [e140._id, e170._id],
    },
    {
      slug: "honda-civic-rebirth-ducktail-spoiler",
      kind: "vehicle_pull",
      vehicleId: civicX._id,
      requireHas: [civicX._id, civicRebirth._id],
    },
  ];
  if (pullRebornFromRebirth) {
    expectedOps.push({
      slug: "honda-civic-rebirth-ducktail-spoiler",
      kind: "vehicle_pull",
      vehicleId: civicReborn._id,
      requireHas: [civicReborn._id, civicRebirth._id],
    });
  }

  const categoryOps = [
    {
      slug: "toyota-corolla-e140-2009-2013-ducktail-trunk-spoiler",
      pull: splitters._id,
      add: spoilers._id,
      requireHasCat: [splitters._id],
    },
    {
      slug: "toyota-corolla-2015-2026-carbon-steering-trim",
      pull: splitters._id,
      add: null,
      requireHasCat: [splitters._id],
    },
    {
      slug: "toyota-corolla-x-shark-fin-style-lower-panel-diffuser",
      pull: splitters._id,
      add: spoilers._id,
      requireHasCat: [splitters._id],
    },
    {
      slug: "honda-civic-x-2016-2021-carbon-steering-trim-cover",
      pull: louvers._id,
      add: null,
      requireHasCat: [louvers._id],
    },
    {
      slug: "toyota-corolla-2009-2026-carbon-steering-monogram-abs",
      pull: steeringCovers._id,
      add: monograms._id,
      requireHasCat: [steeringCovers._id],
    },
    {
      slug: "toyota-aqua-2022-2024-sportline-front-splitter-canards-red-black",
      pull: null,
      add: splitters._id,
      requireHasCat: [], // may have empty categories
      requireEmptyOrMissing: true,
    },
  ];

  const beforeValues = { createdAt: new Date().toISOString(), products: [] };
  const touchedSlugs = [];
  const abortReasons = [];

  function loadP(slug) {
    return db.products.findOne(
      { slug },
      {
        slug: 1,
        name: 1,
        status: 1,
        compatibleVehicles: 1,
        categories: 1,
        pricing: 1,
        inventory: 1,
        media: 1,
        variations: 1,
        seo: 1,
        metaTitle: 1,
        metaDescription: 1,
      }
    );
  }

  function hasId(arr, id) {
    return (arr || []).some((x) => String(x) === String(id));
  }

  // Validate vehicle ops
  expectedOps.forEach((op) => {
    const p = loadP(op.slug);
    if (!p) {
      abortReasons.push("missing product " + op.slug);
      return;
    }
    op.requireHas.forEach((id) => {
      if (!hasId(p.compatibleVehicles, id)) {
        abortReasons.push(op.slug + " missing required vehicle " + id);
      }
    });
    if (!hasId(p.compatibleVehicles, op.vehicleId)) {
      abortReasons.push(op.slug + " already missing pull target vehicle " + op.vehicleId);
    }
  });

  // Validate category ops
  categoryOps.forEach((op) => {
    const p = loadP(op.slug);
    if (!p) {
      abortReasons.push("missing product " + op.slug);
      return;
    }
    if (op.requireEmptyOrMissing) {
      if ((p.categories || []).length > 0 && op.add && hasId(p.categories, op.add)) {
        abortReasons.push(op.slug + " already has add target category");
      }
    }
    (op.requireHasCat || []).forEach((id) => {
      if (!hasId(p.categories, id)) {
        abortReasons.push(op.slug + " missing required category " + id);
      }
    });
    if (op.pull && !hasId(p.categories, op.pull)) {
      abortReasons.push(op.slug + " already missing pull category " + op.pull);
    }
  });

  // Snapshot before values for unique slugs
  const uniqueSlugs = [
    ...new Set([
      ...expectedOps.map((o) => o.slug),
      ...categoryOps.map((o) => o.slug),
    ]),
  ];
  uniqueSlugs.forEach((slug) => {
    const p = loadP(slug);
    if (!p) return;
    beforeValues.products.push({
      _id: String(p._id),
      slug: p.slug,
      name: p.name,
      compatibleVehicles: (p.compatibleVehicles || []).map(String),
      categories: (p.categories || []).map(String),
    });
    touchedSlugs.push(slug);
  });

  print("\nEXPECTED_TOUCHED_SLUGS (" + touchedSlugs.length + "):");
  touchedSlugs.forEach((s) => print(" -", s));

  // Expected unique count: 9 (3 vehicle products + 6 category; rebirth counted once)
  const EXPECTED_UNIQUE = 9;
  if (touchedSlugs.length !== EXPECTED_UNIQUE) {
    abortReasons.push(
      "unique touched count " + touchedSlugs.length + " !== " + EXPECTED_UNIQUE
    );
  }

  // Expected slug set from Phase A + GO decisions
  const expectedSet = [
    "toyota-corolla-x-carbon-fiber-interior-door-handle-panels-2014-2026",
    "toyota-corolla-carbon-fiber-dashboard-trim-3pcs-lcd-2014-2026",
    "honda-civic-rebirth-ducktail-spoiler",
    "toyota-corolla-e140-2009-2013-ducktail-trunk-spoiler",
    "toyota-corolla-2015-2026-carbon-steering-trim",
    "toyota-corolla-x-shark-fin-style-lower-panel-diffuser",
    "honda-civic-x-2016-2021-carbon-steering-trim-cover",
    "toyota-corolla-2009-2026-carbon-steering-monogram-abs",
    "toyota-aqua-2022-2024-sportline-front-splitter-canards-red-black",
  ].sort();
  const gotSet = [...touchedSlugs].sort();
  if (JSON.stringify(expectedSet) !== JSON.stringify(gotSet)) {
    abortReasons.push("touched slug set differs from Phase A+GO plan");
    print("EXPECTED:", expectedSet.join(", "));
    print("GOT:", gotSet.join(", "));
  }

  if (abortReasons.length) {
    print("\nABORT:");
    abortReasons.forEach((r) => print(" -", r));
    throw new Error("Dry-run gate failed — no writes");
  }

  print("\nGATE_OK: touched-doc list matches plan");
  print("pullRebornFromRebirth=", pullRebornFromRebirth);
  print("BEFORE_VALUES_JSON_START");
  print(JSON.stringify(beforeValues, null, 2));
  print("BEFORE_VALUES_JSON_END");

  if (!DO_WRITE) {
    print("\nDry-run only. Re-run with APPLY_FLAG=1 to write.");
    return;
  }

  const results = [];

  // Vehicle pulls — group by slug
  const vehiclePullsBySlug = {};
  expectedOps.forEach((op) => {
    if (!vehiclePullsBySlug[op.slug]) vehiclePullsBySlug[op.slug] = [];
    vehiclePullsBySlug[op.slug].push(op.vehicleId);
  });
  Object.keys(vehiclePullsBySlug).forEach((slug) => {
    const ids = vehiclePullsBySlug[slug];
    const res = db.products.updateOne(
      { slug },
      { $pull: { compatibleVehicles: { $in: ids } } }
    );
    results.push({ slug, op: "vehicle_pull", ids: ids.map(String), res });
  });

  // Mongo forbids $pull + $addToSet on the same path in one update.
  categoryOps.forEach((op) => {
    if (op.pull) {
      const res = db.products.updateOne({ slug: op.slug }, { $pull: { categories: op.pull } });
      results.push({
        slug: op.slug,
        op: "category_pull",
        pull: String(op.pull),
        res,
      });
    }
    if (op.add) {
      const res = db.products.updateOne({ slug: op.slug }, { $addToSet: { categories: op.add } });
      results.push({
        slug: op.slug,
        op: "category_add",
        add: String(op.add),
        res,
      });
    }
  });

  print("\nAPPLY_RESULTS:");
  results.forEach((r) => printjson(r));

  // Verify post state
  print("\nPOST_VERIFY:");
  uniqueSlugs.forEach((slug) => {
    const p = loadP(slug);
    print(
      slug,
      "| vehicles:",
      (p.compatibleVehicles || [])
        .map((id) => {
          const v = db.vehicles.findOne({ _id: id }, { slug: 1 });
          return v ? v.slug : String(id);
        })
        .join(", "),
      "| cats:",
      (p.categories || [])
        .map((id) => {
          const c = db.categories.findOne({ _id: id }, { slug: 1 });
          return c ? c.slug : String(id);
        })
        .join(", ")
    );
  });

  function cv(s) {
    const v = db.vehicles.findOne({ slug: s });
    return db.products.countDocuments({
      compatibleVehicles: v._id,
      status: /^active$/i,
      securityHold: { $ne: true },
    });
  }
  function cc(s) {
    const c = db.categories.findOne({ slug: s });
    return db.products.countDocuments({
      categories: c._id,
      status: /^active$/i,
      securityHold: { $ne: true },
    });
  }
  print("\nAFTER_COUNTS");
  ["toyota-corolla-e140-2009-2014", "honda-civic-x-2016-2021"].forEach((s) =>
    print("V", s, cv(s))
  );
  [
    "splitters-side-skirts",
    "quarter-window-louvers",
    "steering-wheel-covers",
    "stickers-monograms-emblems",
    "spoilers-diffusers",
    "led-indicator-lights",
  ].forEach((s) => print("C", s, cc(s)));
})();
