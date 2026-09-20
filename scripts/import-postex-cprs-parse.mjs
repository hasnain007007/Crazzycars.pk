/**
 * Parse PostEx CPR PDFs + Transactions CSV into an import payload (no DB).
 * Usage: node scripts/import-postex-cprs-parse.mjs [dir] [out.json]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { extractPdfText, parsePostexCprText } from "../storecraft-admin/lib/postexCprParse.js";
import { parseRemittanceSpreadsheet } from "../storecraft-admin/lib/parseRemittanceSpreadsheet.js";

const dir =
  process.argv[2] ||
  "/Users/mac/.cursor/projects/Users-mac-Desktop-CCSMS/attachments/b19a9545-e049-4e7e-bde0-3e2be26d1794";
const outPath = process.argv[3] || "/tmp/postex-cpr-import.json";

function compactTracking(raw) {
  return String(raw || "")
    .trim()
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}
function trackingKeys(raw) {
  const keys = new Set();
  const c = compactTracking(raw);
  const d = String(raw || "").replace(/\D/g, "");
  if (c) keys.add(c);
  if (d) keys.add(d);
  return [...keys];
}
function displayRef(raw) {
  let s = String(raw || "")
    .trim()
    .replace(/^#+/, "")
    .trim();
  if (!s) return "";
  const upper = s.toUpperCase();
  const ord = upper.match(/ORD-?\s*(\d{4})-?\s*(\d{1,6})/);
  if (ord) return `ORD-${ord[1]}-${ord[2].padStart(5, "0")}`;
  return upper;
}
function buildOrderRefMapFromLines(lines) {
  const map = new Map();
  for (const line of lines || []) {
    const ref = displayRef(
      line.orderNumberHint || line.sheetOrderNumber || line.orderNumber || ""
    );
    if (!ref) continue;
    for (const k of trackingKeys(line.trackingNumber)) {
      if (!map.has(k)) map.set(k, ref);
    }
  }
  return map;
}
function mergeOrderRefsByTracking(lines, refMap) {
  if (!refMap?.size) return lines || [];
  return (lines || []).map((line) => {
    const existing = displayRef(
      line.orderNumberHint || line.sheetOrderNumber || line.orderNumber || ""
    );
    if (existing) {
      return { ...line, orderNumberHint: existing, sheetOrderNumber: existing };
    }
    let ref = "";
    for (const k of trackingKeys(line.trackingNumber)) {
      if (refMap.has(k)) {
        ref = refMap.get(k);
        break;
      }
    }
    if (!ref) return line;
    return { ...line, orderNumberHint: ref, sheetOrderNumber: ref };
  });
}

async function main() {
  void fileURLToPath;
  const files = fs.readdirSync(dir);
  const pdfByCpr = new Map();
  for (const f of files) {
    if (!/^CPR-.*\.pdf$/i.test(f)) continue;
    if (/labels|ORD-/i.test(f)) continue;
    const m = f.match(/CPR-([A-Z0-9]+)/i);
    if (!m) continue;
    const key = `CPR-${m[1].toUpperCase()}`;
    if (!pdfByCpr.has(key) || f.length < pdfByCpr.get(key).length) {
      pdfByCpr.set(key, f);
    }
  }

  let refMap = new Map();
  const csvName = files.find((f) => /CPR_Transactions.*\.csv$/i.test(f));
  if (csvName) {
    const csv = parseRemittanceSpreadsheet(fs.readFileSync(path.join(dir, csvName)), {
      filename: csvName,
    });
    refMap = buildOrderRefMapFromLines(csv.lines || []);
    console.error(`CSV refs: ${csvName} → ${refMap.size} tracking keys`);
  }

  const batches = [];
  for (const [cpr, f] of [...pdfByCpr.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const buf = fs.readFileSync(path.join(dir, f));
    const text = await extractPdfText(buf);
    const parsed = parsePostexCprText(text);
    const lines = mergeOrderRefsByTracking(parsed.lines || [], refMap);
    batches.push({
      ...parsed,
      lines,
      filename: f,
      source: "pdf",
    });
    console.error(
      `${cpr}: ${lines.length} lines (${parsed.deliveredCount}D/${parsed.returnedCount}R) net=${parsed.netTotal}`
    );
  }

  fs.writeFileSync(
    outPath,
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      batchCount: batches.length,
      batches,
    })
  );
  console.log(outPath);
  console.error(`Wrote ${batches.length} batches → ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
