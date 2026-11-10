#!/usr/bin/env node
/**
 * Read-only live fitment + category audit via public storefront APIs.
 * No Mongo writes. Respects rate limits.
 *
 *   node scripts/seo/audit-fitment-category-live.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  detectTitleModelConflict,
  canonicalModelToken,
} from "../../storecraft-store/lib/fitment/modelConflict.js";
import { classifyCategoryMembership } from "../../storecraft-store/lib/fitment/categoryMembership.js";

const BASE = process.env.SITE_URL || "https://crazzycars.pk";
const OUT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../seo-reports/crazzycars-remediation-2026-11-11"
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

function csvEscape(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const list = await getJson(`${BASE}/api/products?limit=100&page=1`);
  const total = Number(list.total) || 0;
  const pages = Math.ceil(total / 100) || 1;
  console.log(`catalogue total=${total} pages=${pages}`);

  const summaries = [];
  for (let page = 1; page <= pages; page++) {
    const data = await getJson(`${BASE}/api/products?limit=100&page=${page}`);
    for (const p of data.products || []) summaries.push(p);
    await sleep(150);
    process.stderr.write(`list page ${page}/${pages}\r`);
  }
  console.log(`\nsummaries=${summaries.length}`);

  const fitmentRows = [];
  const categoryRows = [];
  let i = 0;
  for (const s of summaries) {
    i++;
    const slug = s.slug;
    if (!slug) continue;
    let detail;
    try {
      const d = await getJson(`${BASE}/api/products/${encodeURIComponent(slug)}`);
      detail = d.product || d;
    } catch (e) {
      fitmentRows.push({
        productId: s.id || "",
        title: s.name || "",
        url: `${BASE}/${slug}`,
        status: "INSUFFICIENT_EVIDENCE",
        conflict: "api_detail_failed",
        evidence: String(e.message || e),
      });
      await sleep(120);
      continue;
    }

    const cats = Array.isArray(detail.categories) ? detail.categories : [];
    const vc = detail.vehicleCompatibility || {};
    const vehicles = Array.isArray(vc.vehicles) ? vc.vehicles : [];

    for (const cat of cats) {
      const cls = classifyCategoryMembership(
        { name: detail.name, slug: detail.slug, productType: detail.productType },
        cat.slug
      );
      if (cls.status === "VERIFIED_INCORRECT" || cls.status === "AMBIGUOUS") {
        categoryRows.push({
          productId: detail.id || s.id || "",
          title: detail.name || "",
          url: `${BASE}/${detail.slug}`,
          categorySlug: cat.slug,
          categoryName: cat.name,
          status: cls.status,
          reason: cls.reason || "",
          proposedCorrection:
            cls.status === "VERIFIED_INCORRECT"
              ? `Remove category ${cat.slug}; assign correct primary category`
              : "Manual review",
          approvalRequired: "yes",
        });
      }
    }

    for (const row of vehicles) {
      const vehicle = {
        make: row.make,
        model: row.model,
        yearFrom: row.yearFrom,
        yearTo: row.yearTo,
      };
      const hit = detectTitleModelConflict(
        { name: detail.name, slug: detail.slug },
        vehicle
      );
      const titleYears = (String(detail.name || "").match(/20\d{2}/g) || []).map(Number);
      let yearConflict = "";
      if (titleYears.length && row.yearFrom != null) {
        const tmax = Math.max(...titleYears);
        const tmin = Math.min(...titleYears);
        // Title range wholly outside VC row (e.g. title 2022-2024, VC only 2025-2026)
        if (tmax < Number(row.yearFrom) || (row.yearTo != null && tmin > Number(row.yearTo))) {
          yearConflict = `title_years_${tmin}-${tmax}_vs_vc_${row.yearFrom}-${row.yearTo ?? "open"}`;
        }
      }

      let status = "VERIFIED_CORRECT";
      let conflict = "";
      if (hit.conflict) {
        status = "VERIFIED_INCORRECT";
        conflict = hit.reason;
      } else if (yearConflict) {
        status = "AMBIGUOUS";
        conflict = yearConflict;
      } else if (hit.reason === "ambiguous_multi_model_title") {
        status = "AMBIGUOUS";
        conflict = hit.reason;
      }

      if (status !== "VERIFIED_CORRECT") {
        fitmentRows.push({
          productId: detail.id || s.id || "",
          title: detail.name || "",
          url: `${BASE}/${detail.slug}`,
          assignedMake: row.make || "",
          assignedModel: row.model || "",
          productYearRange: `${row.yearFrom ?? ""}-${row.yearTo ?? ""}`,
          vehiclePage: "",
          detectedConflict: conflict,
          evidence: `VC row + title; vehicleToken=${canonicalModelToken(row.make, row.model)}`,
          proposedCorrection: hit.conflict
            ? `Remove ${row.make} ${row.model} VC row / compatibleVehicles link`
            : "Align title years with VC or split SKUs by generation",
          confidence: hit.conflict ? "high" : "medium",
          approvalRequired: "yes",
          status,
        });
      }
    }

    if (i % 25 === 0) {
      process.stderr.write(`detail ${i}/${summaries.length}\r`);
      await sleep(200);
    } else {
      await sleep(80);
    }
  }

  const fitCsv = [
    "productId,title,url,assignedMake,assignedModel,productYearRange,detectedConflict,evidence,proposedCorrection,confidence,approvalRequired,status",
    ...fitmentRows.map((r) =>
      [
        r.productId,
        r.title,
        r.url,
        r.assignedMake,
        r.assignedModel,
        r.productYearRange,
        r.detectedConflict,
        r.evidence,
        r.proposedCorrection,
        r.confidence,
        r.approvalRequired,
        r.status,
      ]
        .map(csvEscape)
        .join(",")
    ),
  ].join("\n");

  const catCsv = [
    "productId,title,url,categorySlug,categoryName,status,reason,proposedCorrection,approvalRequired",
    ...categoryRows.map((r) =>
      [
        r.productId,
        r.title,
        r.url,
        r.categorySlug,
        r.categoryName,
        r.status,
        r.reason,
        r.proposedCorrection,
        r.approvalRequired,
      ]
        .map(csvEscape)
        .join(",")
    ),
  ].join("\n");

  fs.writeFileSync(path.join(OUT_DIR, "FITMENT_AUDIT.csv"), fitCsv);
  fs.writeFileSync(path.join(OUT_DIR, "CATEGORY_AUDIT.csv"), catCsv);
  fs.writeFileSync(
    path.join(OUT_DIR, "FITMENT_CATEGORY_AUDIT_SUMMARY.json"),
    JSON.stringify(
      {
        base: BASE,
        totalProductsListed: summaries.length,
        fitmentIssues: fitmentRows.length,
        categoryIssues: categoryRows.length,
        generatedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );
  console.log(
    `\nwrote FITMENT_AUDIT.csv (${fitmentRows.length}) CATEGORY_AUDIT.csv (${categoryRows.length})`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
