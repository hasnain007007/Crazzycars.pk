/**
 * Repair createdAt / updatedAt (and optional date fields) when not a valid BSON Date.
 * Sets from _id.getTimestamp() (ObjectId creation time).
 *
 * Covers collections corrupted by the 2026-10-29 two-brand object-spread walk:
 *   categories, pages, blogposts, settings
 * (products already repaired via repair-product-timestamps.mongosh.js; re-scanned)
 *
 * Usage (on VPS, live only):
 *   DRY_RUN=1 docker exec -i sialkot-mongo mongosh crazzycars_motorsports \
 *     --quiet --file /dev/stdin < scripts/mongo/repair-collection-timestamps.mongosh.js
 *   DRY_RUN=0 … (same, APPLY)
 *
 * Does NOT change slugs, content, prices, stock, or SEO text.
 */
(() => {
  const EXPECTED_DB = "crazzycars_motorsports";
  const dbName = db.getName();
  if (dbName !== EXPECTED_DB) {
    print(`REFUSE: expected DB ${EXPECTED_DB}, got ${dbName}`);
    quit(2);
  }

  const dry =
    typeof __DRY_RUN !== "undefined"
      ? !!__DRY_RUN
      : String(typeof DRY_RUN !== "undefined" ? DRY_RUN : "1") !== "0";

  /**
   * Corrupt / unusable date values only — empty object `{}`, Invalid Date,
   * or non-date junk. null/undefined are NOT bad (optional fields may be null).
   */
  function isBadDate(v) {
    if (v == null) return false;
    if (v instanceof Date) return Number.isNaN(v.getTime());
    // BSON empty object `{}` (Date wiped by object-spread) or other non-Date objects
    if (typeof v === "object") return true;
    if (typeof v === "string" || typeof v === "number") {
      const d = new Date(v);
      return Number.isNaN(d.getTime());
    }
    return true;
  }

  function getPath(doc, field) {
    const parts = field.split(".");
    let cur = doc;
    for (const p of parts) {
      if (cur == null || typeof cur !== "object" || !(p in cur)) {
        return { exists: false, value: undefined };
      }
      cur = cur[p];
    }
    return { exists: true, value: cur };
  }

  /** createdAt/updatedAt must always be a real Date; optional dates skip null/missing. */
  function shouldRepair(field, exists, value) {
    const required = field === "createdAt" || field === "updatedAt";
    if (required) {
      if (!exists || value == null) return true;
      return isBadDate(value);
    }
    // Optional: only repair present corrupt values (e.g. {}), never null/undefined/missing
    if (!exists || value == null) return false;
    return isBadDate(value);
  }

  const COLLECTIONS = [
    {
      name: "categories",
      fields: ["createdAt", "updatedAt"],
      label: (d) => d.slug || d.name,
    },
    {
      name: "pages",
      fields: ["createdAt", "updatedAt"],
      label: (d) => d.slug || d.title,
    },
    {
      name: "blogposts",
      fields: [
        "createdAt",
        "updatedAt",
        "publishedAt",
        "contentUpdatedAt",
        "viewsAutoIncrease.lastAppliedAt",
      ],
      label: (d) => d.slug || d.title,
    },
    {
      name: "settings",
      fields: ["createdAt", "updatedAt"],
      label: () => "settings",
    },
    {
      name: "products",
      fields: ["createdAt", "updatedAt"],
      label: (d) => d.slug || d.name,
    },
  ];

  const summary = [];

  for (const spec of COLLECTIONS) {
    const coll = db.getCollection(spec.name);
    const fieldCounts = {};
    for (const f of spec.fields) fieldCounts[f] = 0;

    let scanned = 0;
    let wouldFix = 0;
    let fixed = 0;
    const samples = [];

    const projection = { _id: 1, slug: 1, name: 1, title: 1, createdAt: 1, updatedAt: 1 };
    if (spec.name === "blogposts") {
      projection.publishedAt = 1;
      projection.contentUpdatedAt = 1;
      projection.viewsAutoIncrease = 1;
    }

    coll.find({}, projection).forEach((doc) => {
      scanned += 1;
      const oidTs = doc._id.getTimestamp();
      const fix = {};

      for (const field of spec.fields) {
        const { exists, value } = getPath(doc, field);
        if (!shouldRepair(field, exists, value)) continue;

        fieldCounts[field] += 1;
        fix[field] = oidTs;
      }

      if (!Object.keys(fix).length) return;
      wouldFix += 1;
      if (samples.length < 5) {
        samples.push({ label: spec.label(doc), set: Object.keys(fix) });
      }

      if (!dry) {
        coll.updateOne({ _id: doc._id }, { $set: fix });
        fixed += 1;
      }
    });

    summary.push({
      collection: spec.name,
      mode: dry ? "DRY_RUN" : "APPLY",
      scanned,
      fieldCounts,
      wouldFix,
      fixed,
      samples,
    });
  }

  printjson({
    mode: dry ? "DRY_RUN" : "APPLY",
    db: dbName,
    summary,
  });
})();
