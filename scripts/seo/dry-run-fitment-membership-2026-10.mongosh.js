/* eslint-disable */
/**
 * PHASE A dry-run — mongosh script for sialkot_motorsports.
 *   docker exec sialkot-mongo mongosh sialkot_motorsports --quiet /tmp/dry.js
 * Never writes.
 */
(() => {
  const PROD_FP = "84143ac0cb2c3085";
  // Fingerprint computed outside; this script assumes already verified.

  print("=== DRY RUN (no writes) ===");
  print("DB:", db.getName());
  print(
    "Touch plan if GO: products.compatibleVehicles ($pull), products.categories ($pull / $addToSet)."
  );
  print(
    "Never touched: pricing/stock/images/variants/SEO (meta*, seo.*, descriptions)."
  );

  print("\n=== FIELD DISCOVERY ===");
  const sample = db.products.findOne(
    { status: "active" },
    { slug: 1, categories: 1, compatibleVehicles: 1, compatibleCars: 1, "vehicleCompatibility.vehicles": 1 }
  );
  print("products.categories: ObjectId[] → categories._id");
  print("products.compatibleVehicles: ObjectId[] → vehicles._id (primary for /cars pages)");
  print("products.compatibleCars / vehicleCompatibility.vehicles: legacy fitment rows");
  print("carcatalogs.models[]: display/popular only — NOT product membership");
  print("sample.categories[0]:", sample?.categories?.[0] ? String(sample.categories[0]) : null);
  print(
    "sample.compatibleVehicles[0]:",
    sample?.compatibleVehicles?.[0] ? String(sample.compatibleVehicles[0]) : null
  );

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

  const allVehicles = db.vehicles
    .find({}, { slug: 1, displayName: 1, yearFrom: 1, yearTo: 1, make: 1, model: 1 })
    .toArray();
  const vById = {};
  const vBySlug = {};
  allVehicles.forEach((v) => {
    vById[String(v._id)] = v;
    vBySlug[v.slug] = v;
  });

  const allCats = db.categories.find({}, { slug: 1, name: 1, status: 1 }).toArray();
  const cById = {};
  const cBySlug = {};
  allCats.forEach((c) => {
    cById[String(c._id)] = c;
    cBySlug[c.slug] = c;
  });

  function fmtVehicles(ids) {
    return (ids || []).map((id) => {
      const v = vById[String(id)];
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
      const c = cById[String(id)];
      if (!c) return { id: String(id), missing: true };
      return { id: String(id), slug: c.slug, name: c.name };
    });
  }

  function findBySlugOrName(slug, nameRx, slugRx) {
    if (slug) {
      const p = db.products.findOne({ slug });
      if (p) return p;
    }
    if (slugRx) {
      const p = db.products.findOne({ slug: slugRx });
      if (p) return p;
    }
    if (nameRx) {
      const p = db.products.findOne({ name: nameRx });
      if (p) return p;
    }
    return null;
  }

  function reportProduct(label, p) {
    print(`\n--- ${label} ---`);
    if (!p) {
      print("NOT FOUND");
      return;
    }
    print("slug:", p.slug);
    print("name:", p.name);
    print("status:", p.status);
    print("vehicles:", JSON.stringify(fmtVehicles(p.compatibleVehicles)));
    print("categories:", JSON.stringify(fmtCats(p.categories)));
  }

  let docsTouchedVehicle = 0;
  let docsTouchedCategory = 0;
  const touchSet = {};

  print("\n========== A. WRONG-GENERATION VEHICLE TAGS ==========");
  const e140 = vBySlug["toyota-corolla-e140-2009-2014"];
  let e170 = vBySlug["toyota-corolla-e170-e210-2014-present"];
  if (!e170) {
    e170 = allVehicles.find((v) => /corolla/i.test(v.slug) && /e170|e210/i.test(v.slug));
  }
  const civicX = vBySlug["honda-civic-x-2016-2021"];
  const civicRebirth = vBySlug["honda-civic-rebirth-2012-2016"];
  print("E140:", e140 ? `${e140.slug} (${e140._id})` : "MISSING");
  print("E170/E210:", e170 ? `${e170.slug} (${e170._id})` : "MISSING");
  print("Civic X:", civicX ? `${civicX.slug} (${civicX._id})` : "MISSING");
  print("Civic Rebirth:", civicRebirth ? `${civicRebirth.slug} (${civicRebirth._id})` : "MISSING");
  print("All Corolla vehicle slugs:");
  allVehicles
    .filter((v) => /corolla/i.test(v.slug))
    .forEach((v) => print(" -", v.slug, v.displayName, `${v.yearFrom}-${v.yearTo}`));

  const vehicleRemovals = [
    {
      label: "Corolla X door handle panels 2014-2026",
      slug: "toyota-corolla-x-carbon-fiber-interior-door-handle-panels-2014-2026",
      removeVehicleSlug: "toyota-corolla-e140-2009-2014",
      mustKeep: /e170|e210|2014/,
    },
    {
      label: "Corolla Carbon Fiber Dashboard Trim 3PCS 2014-2026",
      nameRx: /Dashboard Trim 3PCS.*2014/i,
      slugRx: /dashboard-trim/i,
      removeVehicleSlug: "toyota-corolla-e140-2009-2014",
      mustKeep: /e170|e210|2014/,
    },
    {
      label: "Civic Rebirth ducktail spoiler",
      slug: "honda-civic-rebirth-ducktail-spoiler",
      slugRx: /civic-rebirth.*ducktail|ducktail.*civic-rebirth/i,
      nameRx: /Civic Rebirth.*Ducktail|Ducktail.*Rebirth/i,
      removeVehicleSlug: "honda-civic-x-2016-2021",
      mustKeep: /rebirth/,
    },
  ];

  vehicleRemovals.forEach((item) => {
    const p = findBySlugOrName(item.slug, item.nameRx, item.slugRx);
    reportProduct(item.label, p);
    if (!p) return;
    const removeV = vBySlug[item.removeVehicleSlug];
    const hasRemove = (p.compatibleVehicles || []).some(
      (id) => String(id) === String(removeV && removeV._id)
    );
    const kept = fmtVehicles(p.compatibleVehicles).filter(
      (v) => v.slug !== item.removeVehicleSlug
    );
    const keepOk = kept.some((v) => item.mustKeep.test(v.slug || ""));
    print(
      "PROPOSE: $pull compatibleVehicles",
      item.removeVehicleSlug,
      removeV ? String(removeV._id) : "?"
    );
    print("  currently tagged for remove target?", hasRemove);
    print("  remaining after pull:", JSON.stringify(kept));
    print("  keep-correct check:", keepOk ? "OK" : "WARN — verify keep list");
    if (hasRemove) {
      docsTouchedVehicle += 1;
      touchSet[String(p._id)] = 1;
    } else {
      print("  NO-OP: already not on that vehicle");
    }
  });

  print("\n========== B. CATEGORY MEMBERSHIP ==========");
  print(
    "Related category slugs:",
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
      nameRx: /Ducktail.*Spoiler|Spoiler.*Ducktail/i,
      slugRx: /ducktail/i,
      removeCat: "splitters-side-skirts",
      suggestCat: "spoilers-diffusers",
      preferInWrong: true,
    },
    {
      label: "Corolla 2015-2026 Carbon Steering Trim",
      nameRx: /Carbon Steering Trim/i,
      slugRx: /steering-trim/i,
      removeCat: "splitters-side-skirts",
      suggestCat: "interior-trims",
      suggestCatAlts: ["carbon-fiber-accessories"],
      preferInWrong: true,
    },
    {
      label: "Corolla X Shark Fin Style Lower Panel Diffuser",
      nameRx: /Shark Fin/i,
      slugRx: /shark-fin/i,
      removeCat: "splitters-side-skirts",
      suggestCat: "spoilers-diffusers",
      preferInWrong: true,
    },
    {
      label: "Civic X Carbon Steering Trim Cover",
      nameRx: /Steering Trim Cover/i,
      slugRx: /steering-trim-cover/i,
      removeCat: "quarter-window-louvers",
      suggestCat: "interior-trims",
      suggestCatAlts: ["carbon-fiber-accessories"],
      preferInWrong: true,
    },
    {
      label: "Civic X Back Mirror Rack Louver Fibreglass",
      nameRx: /Back Mirror Rack Louver|Mirror Rack Louver/i,
      slugRx: /mirror-rack-louver|back-mirror-rack/i,
      removeCat: "quarter-window-louvers",
      suggestCat: null,
      note: "Name includes louver — confirm remove vs keep; if removed needs another category",
      preferInWrong: true,
    },
    {
      label: "Corolla Steering Monogram",
      nameRx: /Steering Monogram/i,
      slugRx: /steering-monogram|monogram/i,
      removeCat: "steering-wheel-covers",
      suggestCat: "interior-trims",
      suggestCatAlts: ["carbon-fiber-accessories"],
      preferInWrong: true,
    },
  ];

  categoryMoves.forEach((item) => {
    const wrongCat = cBySlug[item.removeCat];
    let p = null;
    if (item.preferInWrong && wrongCat) {
      const q = { categories: wrongCat._id, $or: [] };
      if (item.slugRx) q.$or.push({ slug: item.slugRx });
      if (item.nameRx) q.$or.push({ name: item.nameRx });
      if (q.$or.length) p = db.products.findOne(q);
    }
    if (!p) p = findBySlugOrName(null, item.nameRx, item.slugRx);
    reportProduct(item.label, p);
    if (!p) return;
    const cats = fmtCats(p.categories);
    const inWrong = cats.some((c) => c.slug === item.removeCat);
    const suggest = item.suggestCat ? cBySlug[item.suggestCat] : null;
    const remainingAfterPull = cats.filter((c) => c.slug !== item.removeCat);
    const wouldBeEmpty = inWrong && remainingAfterPull.length === 0;
    print("PROPOSE:");
    print(
      "  $pull categories:",
      item.removeCat,
      wrongCat ? String(wrongCat._id) : "MISSING CAT"
    );
    if (wouldBeEmpty) {
      if (suggest) {
        print(
          "  $addToSet categories:",
          item.suggestCat,
          String(suggest._id),
          "(required — otherwise zero categories)"
        );
      } else {
        print("  WARN: would have zero categories after pull — need suggestCat");
      }
    } else {
      print(
        "  keep remaining:",
        remainingAfterPull.map((c) => c.slug).join(", ") || "(none)"
      );
      if (suggest && !cats.some((c) => c.slug === item.suggestCat)) {
        print(
          "  optional $addToSet:",
          item.suggestCat,
          String(suggest._id)
        );
      }
    }
    if (item.suggestCatAlts) {
      print(
        "  alt suggestions:",
        item.suggestCatAlts
          .map((s) => (cBySlug[s] ? s : `${s}(MISSING)`))
          .join(", ")
      );
    }
    if (item.note) print("  NOTE:", item.note);
    print("  currently in wrong cat?", inWrong);
    if (inWrong) {
      docsTouchedCategory += 1;
      touchSet[String(p._id)] = 1;
    } else {
      print("  NO-OP for pull: not in", item.removeCat);
    }
  });

  print("\n--- B. led-indicator-lights: non-indicator LIST ONLY (no removal) ---");
  const ledCat = cBySlug["led-indicator-lights"];
  const ledSuspects = [
    { label: "OSRAM Projector Lights", rx: /osram|projector/i },
    { label: "Universal Angel Wings LED", rx: /angel\s*wings/i },
    { label: "4-Color Switchback Fog LED H11", rx: /switchback|h11/i },
    { label: "Reverse Bright Light Bulb W16W", rx: /reverse|w16w/i },
    { label: "Alto Lava Style Smoke Tail Lights", rx: /lava|tail.?light/i },
  ];
  if (ledCat) {
    ledSuspects.forEach((s) => {
      const hits = db.products
        .find(
          { categories: ledCat._id, $or: [{ name: s.rx }, { slug: s.rx }] },
          { slug: 1, name: 1, status: 1, categories: 1 }
        )
        .toArray();
      print(`\n${s.label}: ${hits.length} hit(s) in led-indicator-lights`);
      hits.forEach((p) => {
        print(
          " ",
          p.slug,
          "|",
          p.name,
          "| cats:",
          fmtCats(p.categories)
            .map((c) => c.slug)
            .join(", ")
        );
      });
      if (!hits.length) {
        const anywhere = db.products.findOne(
          { $or: [{ name: s.rx }, { slug: s.rx }] },
          { slug: 1, name: 1, categories: 1, status: 1 }
        );
        if (anywhere) {
          print(
            "  (found elsewhere, NOT in led-indicator-lights):",
            anywhere.slug,
            "| cats:",
            fmtCats(anywhere.categories)
              .map((c) => c.slug)
              .join(", ")
          );
        } else print("  not found in catalog");
      }
    });
  } else print("led-indicator-lights MISSING");

  print("\n========== C. ACTIVE PRODUCTS WITH NO CATEGORY ==========");
  const noCat = db.products
    .find(
      {
        status: { $regex: /^active$/i },
        securityHold: { $ne: true },
        $or: [{ categories: { $exists: false } }, { categories: null }, { categories: { $size: 0 } }],
      },
      { slug: 1, name: 1, status: 1, categories: 1 }
    )
    .toArray();
  print("count:", noCat.length);
  noCat.forEach((p) => {
    const hint = String(p.name || p.slug || "");
    let suggest = "owner pick";
    if (/spoiler|diffuser|ducktail/i.test(hint)) suggest = "spoilers-diffusers";
    else if (/splitter|side.?skirt|lip/i.test(hint)) suggest = "splitters-side-skirts";
    else if (/louver/i.test(hint)) suggest = "quarter-window-louvers";
    else if (/indicator/i.test(hint)) suggest = "led-indicator-lights";
    else if (/steering.*(cover|trim)|monogram/i.test(hint))
      suggest = "interior-trims or steering-wheel-covers";
    else if (/mat|dashboard/i.test(hint)) suggest = "floor-mats / interior";
    else if (/led|light|drl|fog|tail|headlight/i.test(hint)) suggest = "led-lighting (or child)";
    else if (/carbon/i.test(hint)) suggest = "carbon-fiber-accessories";
    print("-", p.slug, "|", p.name, "| suggest:", suggest);
  });

  print("\n========== D. GENERIC: name years vs vehicle years (report only) ==========");
  const mismatches = [];
  allVehicles.forEach((v) => {
    db.products
      .find(
        {
          status: { $regex: /^active$/i },
          securityHold: { $ne: true },
          compatibleVehicles: v._id,
        },
        { slug: 1, name: 1 }
      )
      .forEach((p) => {
        const yr = yearsFromText(`${p.name} ${p.slug}`);
        if (!yr) return;
        if (!overlap(yr.from, yr.to, v.yearFrom, v.yearTo)) {
          mismatches.push({
            vehicle: v.slug,
            vehicleYears: `${v.yearFrom}–${v.yearTo ?? "present"}`,
            product: p.slug,
            productYears: yr.raw,
            name: p.name,
          });
        }
      });
  });
  print("mismatch count:", mismatches.length);
  mismatches.forEach((m) => {
    print(
      `- vehicle=${m.vehicle} (${m.vehicleYears}) | product=${m.product} (name years ${m.productYears}) | ${m.name}`
    );
  });

  print("\n========== SUMMARY ==========");
  print("Documents that would change (vehicle $pull):", docsTouchedVehicle);
  print("Documents that would change (category $pull / maybe $addToSet):", docsTouchedCategory);
  print("Unique product docs touched:", Object.keys(touchSet).length);
  print("Active products with zero categories (report only):", noCat.length);
  print("Year-mismatch pairs (report only):", mismatches.length);
  print(
    "Fields that WOULD be written on GO: compatibleVehicles, categories only. NOT pricing/stock/images/variants/SEO."
  );
})();
