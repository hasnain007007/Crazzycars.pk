#!/usr/bin/env node
/**
 * Dry-run: list products that WOULD be flagged isBulky=true.
 * Does NOT write to Mongo.
 *
 * Heuristic:
 * - Category slug match (via categories collection ObjectIds)
 * - OR name/slug keyword match
 *
 * Usage (in store container): node dry-run-bulky-seed.mjs
 */
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(
  fs.existsSync("/app/package.json") ? "/app/package.json" : process.cwd() + "/package.json"
);
const { MongoClient } = require("mongodb");

const BULKY_CATEGORY_SLUGS = new Set([
  "splitters-side-skirts",
  "spoilers-diffusers",
  "side-skirts",
  "floor-mats",
  "body-kits-extensions",
  "body-kits",
  "car-splitters-side-skirts",
  "car-spoilers-diffusers",
]);

/**
 * Keyword patterns — intentional word boundaries / phrases to reduce false positives.
 * "LED strip" must NOT match via "spoiler".
 */
const KEYWORD_RES = [
  { id: "splitter", re: /\bsplitters?\b/i },
  { id: "side_skirt", re: /\bside[\s_-]?skirts?\b/i },
  { id: "spoiler", re: /\bspoilers?\b/i },
  { id: "diffuser", re: /\bdiffusers?\b/i },
  { id: "floor_mat", re: /\bfloor[\s_-]?mats?\b/i },
  { id: "body_kit", re: /\bbody[\s_-]?kits?\b/i },
  { id: "lip_kit", re: /\blip[\s_-]?kits?\b/i },
  { id: "side_skirt_alt", re: /\bskirts?\b/i }, // only if also car exterior context — filtered below
];

/** Reject known false-positive-ish phrases even if a keyword hits */
const FALSE_POSITIVE_RES = [
  /\bled[\s_-]?strip/i,
  /\bunder[\s_-]?body\b/i, // underbody LED kits — not freight bulky body kits
  /\bkey[\s_-]?chain\b/i,
  /\bsticker\b/i,
  /\bdecal\b/i,
];

function textBlob(p) {
  return [p.name, p.slug, p.articleNo].filter(Boolean).join(" ");
}

function keywordHits(text) {
  const hits = [];
  for (const { id, re } of KEYWORD_RES) {
    if (id === "side_skirt_alt") continue; // too broad alone
    if (re.test(text)) hits.push(id);
  }
  // bare "skirt" only with side/splitter/body context already covered
  return hits;
}

function isFalsePositive(text) {
  return FALSE_POSITIVE_RES.some((re) => re.test(text));
}

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  const categories = await db
    .collection("categories")
    .find({}, { projection: { slug: 1, name: 1 } })
    .toArray();
  const bulkyCatIds = new Set();
  const catById = new Map();
  for (const c of categories) {
    catById.set(String(c._id), c);
    if (BULKY_CATEGORY_SLUGS.has(String(c.slug || "").toLowerCase())) {
      bulkyCatIds.add(String(c._id));
    }
  }

  const products = await db
    .collection("products")
    .find(
      {},
      {
        projection: {
          articleNo: 1,
          slug: 1,
          name: 1,
          status: 1,
          categories: 1,
          isBulky: 1,
        },
      }
    )
    .toArray();

  const flagged = [];
  const skippedFp = [];

  for (const p of products) {
    const text = textBlob(p);
    const catIds = (p.categories || []).map(String);
    const catSlugs = catIds
      .map((id) => catById.get(id)?.slug)
      .filter(Boolean);
    const catHit = catIds.some((id) => bulkyCatIds.has(id));
    const kw = keywordHits(text);
    const fp = isFalsePositive(text);

    if (fp && (catHit || kw.length)) {
      skippedFp.push({
        articleNo: p.articleNo || "",
        slug: p.slug || "",
        name: p.name || "",
        status: p.status || "",
        reason: "false_positive_guard",
        wouldHaveMatched: { catHit, keywords: kw, catSlugs },
      });
      continue;
    }

    if (!catHit && kw.length === 0) continue;

    flagged.push({
      articleNo: p.articleNo || "",
      slug: p.slug || "",
      name: p.name || "",
      status: p.status || "",
      alreadyIsBulky: p.isBulky === true,
      matchReasons: {
        categories: catHit ? catSlugs.filter((s) => BULKY_CATEGORY_SLUGS.has(String(s).toLowerCase())) : [],
        keywords: kw,
      },
    });
  }

  flagged.sort((a, b) => String(a.articleNo).localeCompare(String(b.articleNo)));

  const report = {
    dryRun: true,
    createdAt: new Date().toISOString(),
    bulkyCategorySlugsUsed: [...BULKY_CATEGORY_SLUGS].sort(),
    bulkyCategoriesFoundInDb: categories
      .filter((c) => BULKY_CATEGORY_SLUGS.has(String(c.slug || "").toLowerCase()))
      .map((c) => ({ slug: c.slug, name: c.name, id: String(c._id) })),
    totals: {
      productsScanned: products.length,
      wouldFlag: flagged.length,
      activeWouldFlag: flagged.filter((p) => p.status === "active").length,
      skippedFalsePositiveGuard: skippedFp.length,
    },
    products: flagged,
    skippedFalsePositives: skippedFp,
  };

  const out = "/tmp/bulky-seed-dry-run.json";
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: true, out, totals: report.totals }, null, 2));
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
