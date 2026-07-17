/**
 * Shared stock level helpers for reports, alerts, and exports.
 */

/**
 * @param {number} qty
 * @param {number} threshold
 * @param {boolean} trackInventory
 * @returns {"out" | "low" | "healthy" | "untracked"}
 */
export function computeStockStatus(qty, threshold, trackInventory) {
  if (trackInventory === false) return "untracked";
  const q = Number(qty) || 0;
  const th = Number(threshold);
  const t = Number.isFinite(th) ? th : 5;
  if (q <= 0) return "out";
  if (q <= t) return "low";
  return "healthy";
}

function mainImageUrl(product) {
  const imgs = product?.media?.images;
  if (!Array.isArray(imgs) || !imgs.length) return "";
  const main = imgs.find((i) => i?.isMain) || imgs[0];
  return main?.url || "";
}

/**
 * @param {object} doc — lean Product with optional categories populated
 */
export function productToStockRow(doc) {
  const track = doc.inventory?.trackQuantity === false ? false : doc.inventory?.trackInventory !== false;
  const qty = Math.max(
    0,
    Number(
      doc.inventory?.quantity ??
        doc.inventory?.stock ??
        doc.inventory?.stockQuantity ??
        doc.stock ??
        doc.quantity ??
        0
    ) || 0
  );
  const threshold = Number(doc.inventory?.lowStockThreshold ?? 5);
  const status = computeStockStatus(qty, threshold, track);
  const cats = Array.isArray(doc.categories)
    ? doc.categories.map((c) => (typeof c === "object" && c?.name ? c.name : "")).filter(Boolean)
    : [];
  return {
    id: doc._id.toString(),
    name: doc.name || "",
    articleNo: doc.articleNo || "",
    categoryIds: Array.isArray(doc.categories)
      ? doc.categories.map((c) => (typeof c === "object" && c?._id ? c._id.toString() : String(c)))
      : [],
    categoryLabel: cats.join(", ") || "—",
    imageUrl: mainImageUrl(doc),
    quantity: qty,
    threshold,
    trackInventory: track,
    status,
    restockRequested: Boolean(doc.restockRequested),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : "",
  };
}

export function sortStockRows(rows, sortKey) {
  const copy = [...rows];
  switch (sortKey) {
    case "stock_desc":
      copy.sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name));
      break;
    case "name":
      copy.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "updated":
      copy.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      break;
    case "stock_asc":
    default:
      copy.sort((a, b) => a.quantity - b.quantity || a.name.localeCompare(b.name));
  }
  return copy;
}

export function filterStockRows(rows, { search, status, categoryId }) {
  let out = rows;
  const q = (search || "").trim().toLowerCase();
  if (q) {
    out = out.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        String(r.articleNo || "")
          .toLowerCase()
          .includes(q)
    );
  }
  if (status && status !== "all") {
    out = out.filter((r) => {
      if (status === "out") return r.status === "out";
      if (status === "low") return r.status === "low";
      if (status === "healthy") return r.status === "healthy" || r.status === "untracked";
      return true;
    });
  }
  if (categoryId) {
    out = out.filter((r) => r.categoryIds.includes(categoryId));
  }
  return out;
}

export function summarizeStockRows(rows) {
  let outOfStock = 0;
  let lowStock = 0;
  let healthy = 0;
  for (const r of rows) {
    if (r.status === "untracked") {
      healthy += 1;
      continue;
    }
    if (r.status === "out") outOfStock += 1;
    else if (r.status === "low") lowStock += 1;
    else healthy += 1;
  }
  return { outOfStock, lowStock, healthy };
}

export function escapeCsvCell(val) {
  const s = String(val ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function stockRowsToCsv(rows) {
  const header = [
    "Product ID",
    "Article No.",
    "Product Name",
    "Category",
    "Current Stock",
    "Threshold",
    "Status",
    "Last Updated",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    const statusLabel =
      r.status === "out" ? "Out of Stock" : r.status === "low" ? "Low Stock" : "Healthy";
    lines.push(
      [
        escapeCsvCell(r.id),
        escapeCsvCell(r.articleNo),
        escapeCsvCell(r.name),
        escapeCsvCell(r.categoryLabel),
        escapeCsvCell(r.quantity),
        escapeCsvCell(r.threshold),
        escapeCsvCell(statusLabel),
        escapeCsvCell(r.updatedAt),
      ].join(",")
    );
  }
  return lines.join("\r\n");
}
