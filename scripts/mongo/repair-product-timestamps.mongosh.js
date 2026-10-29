/**
 * Repair Product createdAt / updatedAt when not a valid BSON Date.
 * Sets from _id.getTimestamp() (ObjectId creation time).
 *
 * Usage (on VPS, live only):
 *   DRY_RUN=1 docker exec -i sialkot-mongo mongosh crazzycars_motorsports \
 *     --quiet --file /dev/stdin < scripts/mongo/repair-product-timestamps.mongosh.js
 *   DRY_RUN=0 docker exec -i sialkot-mongo mongosh crazzycars_motorsports \
 *     --quiet --file /dev/stdin < scripts/mongo/repair-product-timestamps.mongosh.js
 *
 * Or pass: mongosh … --eval 'globalThis.__DRY_RUN=true' then load this file.
 *
 * Does NOT change prices, stock, slugs, or SEO fields.
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

  function isBadDate(v) {
    if (v == null) return true;
    if (v instanceof Date) return Number.isNaN(v.getTime());
    // BSON type object that is not a Date (e.g. {})
    if (typeof v === "object") return true;
    return true;
  }

  const cursor = db.products.find(
    {},
    { _id: 1, slug: 1, createdAt: 1, updatedAt: 1 }
  );

  let scanned = 0;
  let badCreated = 0;
  let badUpdated = 0;
  let wouldFix = 0;
  let fixed = 0;
  const samples = [];

  cursor.forEach((p) => {
    scanned += 1;
    const fix = {};
    const oidTs = p._id.getTimestamp();

    if (isBadDate(p.createdAt)) {
      badCreated += 1;
      fix.createdAt = oidTs;
    }
    if (isBadDate(p.updatedAt)) {
      badUpdated += 1;
      // Prefer existing valid updatedAt; otherwise oid timestamp (not "now")
      // so we do not bump every product to deploy time.
      fix.updatedAt = oidTs;
    }

    if (!Object.keys(fix).length) return;
    wouldFix += 1;
    if (samples.length < 8) {
      samples.push({
        slug: p.slug,
        createdAtWas: p.createdAt,
        updatedAtWas: p.updatedAt,
        set: fix,
      });
    }

    if (!dry) {
      db.products.updateOne({ _id: p._id }, { $set: fix });
      fixed += 1;
    }
  });

  printjson({
    mode: dry ? "DRY_RUN" : "APPLY",
    db: dbName,
    scanned,
    badCreated,
    badUpdated,
    wouldFix,
    fixed,
    samples,
  });
})();
