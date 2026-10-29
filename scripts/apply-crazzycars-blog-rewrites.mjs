#!/usr/bin/env node
/**
 * apply-crazzycars-blog-rewrites.mjs
 *
 * Applies CrazzyCars blog rewrites from content/crazzycars-blogs-REVIEW.md to MongoDB.
 *
 * Dry-run (default):
 *   node scripts/apply-crazzycars-blog-rewrites.mjs --site=crazzycars
 *
 * Apply:
 *   MONGODB_URI=mongodb://sialkot-mongo:27017/crazzycars_motorsports \
 *     node scripts/apply-crazzycars-blog-rewrites.mjs --site=crazzycars --apply
 *
 * Safety:
 *   - Requires --site=crazzycars
 *   - URI must end with /crazzycars_motorsports (never sialkot_motorsports)
 *   - Refuses content containing Sialkot NAP / domain strings
 *   - Backs up every document to disk BEFORE the first write
 *   - Follows docs/OPS-PRODUCTION-DATABASE.md (run on VPS / Docker network)
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const EXPECTED_DB = "crazzycars_motorsports";
const FORBIDDEN_DB = "sialkot_motorsports";

const siteRaw = process.argv.find((a) => a.startsWith("--site="))?.slice("--site=".length);
if (siteRaw !== "crazzycars") {
  console.error(`Refusing to run: pass --site=crazzycars (got ${JSON.stringify(siteRaw || "")}).`);
  process.exit(2);
}

const URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27019/crazzycars_motorsports";

const dbName = String(URI).split("/").pop()?.split("?")[0] || "";
if (dbName !== EXPECTED_DB) {
  console.error(`Refusing to run: URI DB must be "${EXPECTED_DB}" (got "${dbName}").`);
  process.exit(2);
}
if (dbName === FORBIDDEN_DB || new RegExp(`/${FORBIDDEN_DB}(\\?|$)`).test(URI)) {
  console.error(`Refusing to run: URI points at foreign DB ${FORBIDDEN_DB}.`);
  process.exit(2);
}

const APPLY = process.argv.includes("--apply");
const DRY_RUN = !APPLY;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const REVIEW_MD = path.join(ROOT, "content", "crazzycars-blogs-REVIEW.md");
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(ROOT, "backups");
const DATE_MOD = "2026-10-29";

const FORBIDDEN_STRINGS = [
  /sialkot\s*motorsports/i,
  /sialkotmotorsports\.com/i,
  /03284210007/,
  /03284\s*210007/,
  /sialkot\s*motor\s*sports/i,
];

function assertNoCrossBrand(slug, html) {
  for (const re of FORBIDDEN_STRINGS) {
    if (re.test(html || "")) {
      console.error(`[BLOCKED] slug "${slug}" contains forbidden cross-brand string matching /${re.source}/`);
      process.exit(3);
    }
  }
}

function parseReviewMd(mdPath) {
  const raw = fs.readFileSync(mdPath, "utf8");
  const posts = [];
  const parts = raw.split(/^(?=## slug:)/m);

  for (const part of parts) {
    const slugMatch = part.match(/^## slug:\s*(.+)/);
    if (!slugMatch) continue;
    const slug = slugMatch[1].trim();

    const extract = (key) => {
      const m = part.match(new RegExp(`^${key}:\\s*(.+)`, "m"));
      return m ? m[1].trim() : "";
    };

    const htmlMatch = part.match(/^---html\n([\s\S]*?)\n---/m);
    const html = htmlMatch ? htmlMatch[1].trim() : "";
    const isNeedsDb = html.startsWith("<!-- NEEDS_DB:");

    posts.push({
      slug,
      overlap_pct: extract("overlap_pct"),
      title: extract("title"),
      meta_description: extract("meta_description"),
      last_updated: extract("last_updated"),
      datePublished: extract("datePublished"),
      image: extract("image"),
      html,
      isNeedsDb,
    });
  }

  return posts;
}

function writeBackup(docs) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(BACKUP_DIR, `blog-rewrites-backup-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(docs, null, 2) + "\n");
  return file;
}

const require = createRequire(pathToFileURL(path.join(ROOT, "storecraft-store", "package.json")));
const mongoose = require("mongoose");

const BlogPostSchema = new mongoose.Schema({}, { strict: false, collection: "blogposts" });
const BlogPost = mongoose.models.BlogPost || mongoose.model("BlogPost", BlogPostSchema);

async function main() {
  console.log(`\n=== apply-crazzycars-blog-rewrites.mjs ===`);
  console.log(`Site:    crazzycars (DB: ${EXPECTED_DB})`);
  console.log(`Mode:    ${DRY_RUN ? "DRY-RUN (pass --apply to write)" : "APPLY"}`);
  console.log(`URI:     ${URI.replace(/\/\/[^@]*@/, "//***@")}\n`);

  if (!fs.existsSync(REVIEW_MD)) {
    console.error(`REVIEW file not found: ${REVIEW_MD}`);
    process.exit(1);
  }

  const posts = parseReviewMd(REVIEW_MD);
  console.log(`Parsed ${posts.length} sections from REVIEW.md\n`);

  await mongoose.connect(URI, { serverSelectionTimeoutMS: 8000 });
  console.log(`Connected to MongoDB (${EXPECTED_DB})\n`);

  const results = [];
  const backupDocs = [];
  const pendingUpdates = [];

  for (const post of posts) {
    const { slug, html, title, meta_description, image, overlap_pct, isNeedsDb } = post;

    if (isNeedsDb) {
      console.log(`[SKIP] ${slug} — NEEDS_DB (no content in export; retrieve from DB first)`);
      results.push({ slug, status: "NEEDS_DB", action: "skipped" });
      continue;
    }

    assertNoCrossBrand(slug, html);
    assertNoCrossBrand(slug, title);

    const existing = await BlogPost.findOne({ slug }).lean();
    if (!existing) {
      console.log(`[NOT_FOUND] ${slug} — document not in DB; skipping`);
      results.push({ slug, status: "not_found_in_db", action: "skipped" });
      continue;
    }

    backupDocs.push({ slug, _id: existing._id, before: existing });

    const update = {
      title: title || existing.title,
      content: html,
      seo: {
        ...(existing.seo || {}),
        // Storefront reads seo.metaTitle / seo.metaDescription (not title/description).
        metaTitle: title,
        metaDescription: meta_description,
        title: title,
        description: meta_description,
      },
      updatedAt: new Date(DATE_MOD),
      contentUpdatedAt: new Date(DATE_MOD),
    };
    if (image) update.featuredImage = { ...(existing.featuredImage || {}), url: image };

    const beforeLen = String(existing.content || "").length;
    const afterLen = html.length;
    const titleChanged = String(existing.title || "") !== title;
    const seoTitleBefore = existing.seo?.title || "";
    const seoDescBefore = existing.seo?.description || "";

    if (DRY_RUN) {
      console.log(`[DRY-RUN] Would update: ${slug}`);
      console.log(`  title: ${title}${titleChanged ? " (title field unchanged in $set; seo.title updated)" : ""}`);
      console.log(`  seo.title: ${JSON.stringify(seoTitleBefore).slice(0, 60)} → ${JSON.stringify(title).slice(0, 60)}`);
      console.log(`  seo.description len: ${String(seoDescBefore).length} → ${meta_description.length}`);
      console.log(`  content len: ${beforeLen} → ${afterLen} (overlap_pct=${overlap_pct})`);
    }

    pendingUpdates.push({ slug, update, overlap_pct, title });
    results.push({
      slug,
      status: "ok",
      action: DRY_RUN ? "dry-run" : "pending",
      overlap_pct,
      title,
      beforeLen,
      afterLen,
    });
  }

  if (APPLY) {
    if (backupDocs.length === 0) {
      console.log("\nNothing to apply.");
    } else {
      const backupFile = writeBackup(backupDocs);
      console.log(`\nBackup written BEFORE writes: ${backupFile}`);
      for (const row of pendingUpdates) {
        await BlogPost.updateOne({ slug: row.slug }, { $set: row.update });
        console.log(`[APPLIED] ${row.slug}`);
        const r = results.find((x) => x.slug === row.slug);
        if (r) r.action = "applied";
      }
    }
  }

  await mongoose.disconnect();

  console.log("\n=== SUMMARY ===");
  const applied = results.filter((r) => r.action === "applied");
  const dryRan = results.filter((r) => r.action === "dry-run");
  const needsDb = results.filter((r) => r.status === "NEEDS_DB");
  const notFound = results.filter((r) => r.status === "not_found_in_db");

  if (DRY_RUN) console.log(`  Dry-run updates:  ${dryRan.length}`);
  else console.log(`  Applied:          ${applied.length}`);
  console.log(`  NEEDS_DB:         ${needsDb.length}`);
  console.log(`  Not in DB:        ${notFound.length}`);

  if (needsDb.length) {
    console.log("\n  NEEDS_DB slugs (retrieve from DB before rewrite):");
    needsDb.forEach((r) => console.log(`    - ${r.slug}`));
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
