#!/usr/bin/env node
/**
 * Fail the build if banned policy literals appear outside config + copy helpers.
 * Works from repo root (local CI) or storecraft-store-only Docker context (Coolify).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const STORE = path.resolve(SCRIPT_DIR, "..");
const MONOREPO_ROOT = path.resolve(STORE, "..");
/** Full repo when tests + config exist; otherwise storecraft-store (Coolify Docker). */
const ROOT =
  fs.existsSync(path.join(MONOREPO_ROOT, "tests")) &&
  fs.existsSync(path.join(MONOREPO_ROOT, "config", "store-policy.ts"))
    ? MONOREPO_ROOT
    : STORE;

const STORE_ROOT = fs.existsSync(path.join(ROOT, "storecraft-store"))
  ? path.join(ROOT, "storecraft-store")
  : ROOT;

const ALLOWLIST = new Set(
  [
    path.join(STORE_ROOT, "config/store-policy.js"),
    path.join(ROOT, "config/store-policy.ts"),
    path.join(ROOT, "storecraft-admin/lib/storePolicyDefaults.js"),
    path.join(STORE_ROOT, "lib/storePolicyCopy.js"),
    path.join(ROOT, "scripts/check-policy-literals.mjs"),
    path.join(STORE_ROOT, "scripts/check-policy-literals.mjs"),
    path.join(ROOT, "tests/store-policy.test.ts"),
    path.join(ROOT, "docs/DATA-ISSUES.md"),
    path.join(ROOT, "docs/AUDIT.md"),
    path.join(STORE_ROOT, "scripts/seed-policy-pages.mjs"),
  ].filter((p) => fs.existsSync(p))
);

const SCAN_ROOTS = [STORE_ROOT, path.join(ROOT, "tests")].filter((p) => fs.existsSync(p));
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "dist", "coverage"]);
const EXT = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (EXT.has(path.extname(name))) out.push(full);
  }
  return out;
}

function scanLine(line) {
  const hits = [];
  if (/\bfree\s+(?:delivery|shipping)\b/i.test(line)) hits.push("free-delivery/shipping marketing");
  if (/\borders?\s+over\s+Rs\.?\s/i.test(line) && /\bfree\b/i.test(line)) {
    hits.push("free-over-order copy");
  }
  if (/\b(?:Rs\.?\s*)?2,?999\b|\b2999\b/.test(line) && !/year|model|sku/i.test(line)) {
    hits.push("legacy free threshold 2999");
  }
  if (/\b(?:Rs\.?\s*)?9,?999\b|\b9999\b/.test(line) && /\b(?:ship|deliver|threshold|order)\b/i.test(line)) {
    hits.push("legacy free threshold 9999");
  }
  if (/\bRs\.?\s*250\b|\b250\s*PKR\b/i.test(line)) {
    if (!/STORE_POLICY|standardFeePKR|standardFee|standardDeliveryFee|SPOILER|Daewoo|advancePaymentAmount/i.test(line)) {
      hits.push("hardcoded standard fee Rs. 250");
    }
  }
  if (/\b7[\s-]*day\s+return|\b7-day\s+return/i.test(line)) hits.push("7-day return marketing");
  if (/hassle[\s-]*free\s+returns/i.test(line)) hits.push("hassle-free returns");
  return hits;
}

const violations = [];

for (const scanRoot of SCAN_ROOTS) {
  for (const file of walk(scanRoot)) {
    if (ALLOWLIST.has(file)) continue;
    const rel = path.relative(ROOT, file);
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      for (const rule of scanLine(line)) {
        violations.push({ file: rel, line: i + 1, rule });
      }
    });
  }
}

if (violations.length) {
  console.error("Policy literal guard failed — move copy/fees/returns to store-policy + storePolicyCopy:\n");
  for (const v of violations) {
    console.error(`  • ${v.file}:${v.line} (${v.rule})`);
  }
  process.exit(1);
}

console.log("Policy literal guard passed.");

const UI_EXT = new Set([".jsx", ".tsx"]);
const UI_SCAN_ROOTS = [STORE_ROOT, path.join(ROOT, "storecraft-admin")].filter((p) => fs.existsSync(p));

const UI_PATH_PREFIX_ALLOW = fs.existsSync(path.join(ROOT, "storecraft-admin"))
  ? [path.join(ROOT, "storecraft-admin/components/shipping") + path.sep]
  : [];

function walkUi(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walkUi(full, out);
    else if (UI_EXT.has(path.extname(name))) out.push(full);
  }
  return out;
}

function uiPathAllowed(filePath) {
  return UI_PATH_PREFIX_ALLOW.some((prefix) => filePath.startsWith(prefix));
}

function scanUiLine(line) {
  const hits = [];
  if (/\bfree\s+(?:delivery|shipping)\b/i.test(line)) {
    hits.push("free-delivery/shipping in UI (.jsx/.tsx)");
  }
  if (/\d+\s*(?:day|days)\s*(?:return|refund)/i.test(line)) {
    hits.push("N-day return/refund literal in UI (.jsx/.tsx)");
  }
  if (/\bRs\.?\s*250\b/i.test(line)) hits.push("hardcoded Rs. 250 in UI (.jsx/.tsx)");
  if (/\bRs\.?\s*150\b/i.test(line)) hits.push("hardcoded Rs. 150 in UI (.jsx/.tsx)");
  // Bare Rs. 999 / 999 fee literals — same bar as 150/250/9999 (not only with free-delivery copy).
  if (/\bRs\.?\s*999\b/i.test(line) || /\b999\s*PKR\b/i.test(line)) {
    hits.push("hardcoded Rs. 999 in UI (.jsx/.tsx)");
  }
  if (/\bRs\.?\s*9,?999\b/i.test(line)) hits.push("hardcoded Rs. 9,999 in UI (.jsx/.tsx)");
  return hits;
}

const uiViolations = [];

for (const scanRoot of UI_SCAN_ROOTS) {
  for (const file of walkUi(scanRoot)) {
    if (uiPathAllowed(file)) continue;
    const rel = path.relative(ROOT, file);
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      for (const rule of scanUiLine(line)) {
        uiViolations.push({ file: rel, line: i + 1, rule });
      }
    });
  }
}

if (uiViolations.length) {
  console.error(
    "Policy UI literal guard failed — use config/store-policy.ts + storePolicyCopy (storefront) or storePolicyDefaults (admin):\n"
  );
  for (const v of uiViolations) {
    console.error(`  • ${v.file}:${v.line} (${v.rule})`);
  }
  process.exit(1);
}

console.log("Policy UI literal guard passed.");
