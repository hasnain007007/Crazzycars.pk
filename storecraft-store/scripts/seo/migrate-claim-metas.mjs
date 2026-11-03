#!/usr/bin/env node
/**
 * Guarded dry-run migration: strip Premium / Best / OEM-style from car + blog metas.
 * Never touches slugs, prices, stock, or status.
 *
 *   node scripts/seo/migrate-claim-metas.mjs
 *   node scripts/seo/migrate-claim-metas.mjs --apply
 */
import mongoose from "mongoose";

const apply = process.argv.includes("--apply");
const CLAIM_RE = /\b(best|#1|oem|genuine|original|perfect|premium|100%)\b/gi;
const OEM_STYLE_RE = /\bOEM-style\b/gi;

function scrub(text) {
  return String(text || "")
    .replace(OEM_STYLE_RE, "factory-style")
    .replace(CLAIM_RE, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI required");
  process.exit(1);
}

await mongoose.connect(uri);
const vehicles = mongoose.connection.collection("vehicles");
const blogs = mongoose.connection.collection("blogposts");
const catalog = mongoose.connection.collection("carcatalogs");

const plan = { vehicles: [], blogs: [], catalogModels: [] };

for await (const v of vehicles.find(
  {},
  { projection: { slug: 1, metaTitle: 1, metaDescription: 1, status: 1 } }
)) {
  const title = scrub(v.metaTitle);
  const desc = scrub(v.metaDescription);
  if (title !== String(v.metaTitle || "").trim() || desc !== String(v.metaDescription || "").trim()) {
    plan.vehicles.push({
      slug: v.slug,
      from: { metaTitle: v.metaTitle, metaDescription: v.metaDescription },
      to: { metaTitle: title, metaDescription: desc },
    });
  }
}

for await (const b of blogs.find(
  {},
  { projection: { slug: 1, title: 1, "seo.metaTitle": 1, "seo.metaDescription": 1, excerpt: 1 } }
)) {
  const metaTitle = scrub(b.seo?.metaTitle || "");
  const metaDescription = scrub(b.seo?.metaDescription || "");
  const title = scrub(b.title || "");
  const changed =
    metaTitle !== String(b.seo?.metaTitle || "").trim() ||
    metaDescription !== String(b.seo?.metaDescription || "").trim() ||
    title !== String(b.title || "").trim();
  if (changed) {
    plan.blogs.push({
      slug: b.slug,
      from: { title: b.title, seo: b.seo },
      to: { title, seo: { metaTitle, metaDescription } },
    });
  }
}

for await (const make of catalog.find({}, { projection: { name: 1, models: 1 } })) {
  const models = Array.isArray(make.models) ? make.models : [];
  models.forEach((m, i) => {
    const metaTitle = scrub(m.metaTitle);
    const metaDescription = scrub(m.metaDescription);
    if (
      metaTitle !== String(m.metaTitle || "").trim() ||
      metaDescription !== String(m.metaDescription || "").trim()
    ) {
      plan.catalogModels.push({
        make: make.name,
        slug: m.slug,
        index: i,
        from: { metaTitle: m.metaTitle, metaDescription: m.metaDescription },
        to: { metaTitle, metaDescription },
      });
    }
  });
}

console.log(
  JSON.stringify(
    {
      apply,
      dryRun: !apply,
      counts: {
        vehicles: plan.vehicles.length,
        blogs: plan.blogs.length,
        catalogModels: plan.catalogModels.length,
      },
      sample: {
        vehicles: plan.vehicles.slice(0, 5),
        blogs: plan.blogs.slice(0, 5),
        catalogModels: plan.catalogModels.slice(0, 5),
      },
    },
    null,
    2
  )
);

if (apply) {
  for (const row of plan.vehicles) {
    await vehicles.updateOne(
      { slug: row.slug },
      { $set: { metaTitle: row.to.metaTitle, metaDescription: row.to.metaDescription } }
    );
  }
  for (const row of plan.blogs) {
    await blogs.updateOne(
      { slug: row.slug },
      {
        $set: {
          title: row.to.title || row.from.title,
          "seo.metaTitle": row.to.seo.metaTitle,
          "seo.metaDescription": row.to.seo.metaDescription,
        },
      }
    );
  }
  for (const row of plan.catalogModels) {
    await catalog.updateOne(
      { name: row.make, [`models.${row.index}.slug`]: row.slug },
      {
        $set: {
          [`models.${row.index}.metaTitle`]: row.to.metaTitle,
          [`models.${row.index}.metaDescription`]: row.to.metaDescription,
        },
      }
    );
  }
  console.log("applied", {
    vehicles: plan.vehicles.length,
    blogs: plan.blogs.length,
    catalogModels: plan.catalogModels.length,
  });
}

await mongoose.disconnect();
