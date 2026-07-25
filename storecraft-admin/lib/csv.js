/**
 * Minimal CSV parse/stringify (RFC4180-ish) — no extra deps.
 */

export function escapeCsvCell(value) {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function rowsToCsv(headers, rows) {
  const lines = [headers.map(escapeCsvCell).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsvCell(row[h])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

/** Parse CSV text into array of objects keyed by header row. */
export function parseCsv(text) {
  const raw = String(text || "").replace(/^\uFEFF/, "");
  if (!raw.trim()) return { headers: [], rows: [] };

  const rows = [];
  let i = 0;
  let field = "";
  let row = [];
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    // skip fully empty trailing rows
    if (row.length === 1 && row[0] === "" && rows.length) {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  };

  while (i < raw.length) {
    const ch = raw[i];
    if (inQuotes) {
      if (ch === '"') {
        if (raw[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      pushField();
      i += 1;
      continue;
    }
    if (ch === "\n") {
      pushField();
      pushRow();
      i += 1;
      continue;
    }
    if (ch === "\r") {
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  pushField();
  if (row.length > 1 || (row.length === 1 && row[0] !== "")) pushRow();

  if (!rows.length) return { headers: [], rows: [] };

  const headers = rows[0].map((h) => String(h || "").trim());
  const data = [];
  for (let r = 1; r < rows.length; r += 1) {
    const cells = rows[r];
    if (!cells.some((c) => String(c || "").trim())) continue;
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cells[idx] != null ? String(cells[idx]) : "";
    });
    data.push(obj);
  }
  return { headers, rows: data };
}

export function splitList(value) {
  return String(value || "")
    .split(/[|;,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function joinList(arr, sep = "|") {
  if (!Array.isArray(arr)) return "";
  return arr.map((x) => String(x || "").trim()).filter(Boolean).join(sep);
}

export function truthy(v, fallback = false) {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return fallback;
  if (["1", "true", "yes", "y", "on", "active"].includes(s)) return true;
  if (["0", "false", "no", "n", "off"].includes(s)) return false;
  return fallback;
}

export function num(v, fallback = 0) {
  const n = Number(String(v ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : fallback;
}

export function csvResponse(filename, csvText) {
  return new Response(csvText, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
