/**
 * Page-specific PDP facts grounded only in product fields / fitment rows.
 * Never invents materials, box contents, or years.
 */

function yearLabel(from, to) {
  const a = Number(from);
  const b = Number(to);
  if (!Number.isFinite(a) && !Number.isFinite(b)) return "";
  if (Number.isFinite(a) && Number.isFinite(b) && a !== b) return `${a}–${b}`;
  if (Number.isFinite(a)) return String(a);
  return String(b);
}

function fitmentLines(product, max = 6) {
  const lines = [];
  const seen = new Set();
  const push = (s) => {
    const t = String(s || "").trim();
    if (!t) return;
    const k = t.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    lines.push(t);
  };

  const vc = product?.vehicleCompatibility;
  if (product?.isUniversal || vc?.fitmentType === "universal") {
    push(vc?.universalNote || "Universal fit (see product notes)");
    return lines;
  }

  for (const v of Array.isArray(product?.compatibleVehicles) ? product.compatibleVehicles : []) {
    if (!v || typeof v !== "object") continue;
    if (v.displayName) {
      push(v.displayName);
      continue;
    }
    const base = `${v.make || ""} ${v.model || ""}`.trim();
    const yrs = yearLabel(v.yearFrom, v.yearTo);
    push(yrs ? `${base} (${yrs})` : base);
  }

  for (const row of Array.isArray(vc?.vehicles) ? vc.vehicles : []) {
    if (!row || typeof row !== "object") continue;
    const base = `${row.make || ""} ${row.model || ""}`.trim();
    const gen = String(row.generation || row.nickname || "").trim();
    const yrs = yearLabel(row.yearFrom, row.yearTo);
    const trim = String(row.trim || row.body || "").trim();
    let label = base;
    if (gen) label = `${label} ${gen}`.trim();
    if (yrs) label = `${label} (${yrs})`;
    if (trim) label = `${label}, ${trim}`;
    push(label);
  }

  return lines.slice(0, max);
}

function specValue(product, needles) {
  const rows = Array.isArray(product?.specifications) ? product.specifications : [];
  for (const row of rows) {
    const label = String(row?.label || row?.key || "").toLowerCase();
    if (!needles.some((n) => label.includes(n))) continue;
    const v = String(row?.value || "").trim();
    if (v) return v;
  }
  return "";
}

/**
 * @param {object} product
 * @param {{ label?: string, slug?: string, href?: string }[]} [carLinks]
 * @returns {{
 *   sku: string,
 *   fitment: string[],
 *   material: string,
 *   included: string,
 *   specs: { label: string, value: string }[],
 *   neighbors: { label: string, href: string }[],
 *   hasContent: boolean
 * }}
 */
export function buildProductSpecifics(product, carLinks = []) {
  const sku = String(product?.articleNo || "").trim();
  const fitment = fitmentLines(product);
  const material =
    specValue(product, ["material", "finish", "construction"]) ||
    "";
  const included = String(
    product?.whatsIncluded || product?.packageIncludes || ""
  ).trim();
  const specs = (Array.isArray(product?.specifications) ? product.specifications : [])
    .map((row) => ({
      label: String(row?.label || row?.key || "").trim(),
      value: String(row?.value || "").trim(),
    }))
    .filter((r) => r.label && r.value)
    .slice(0, 8);

  const neighbors = (Array.isArray(carLinks) ? carLinks : [])
    .map((c) => ({
      label: String(c?.label || "").trim(),
      href: String(c?.href || (c?.slug ? `/cars/${c.slug}` : "")).trim(),
    }))
    .filter((c) => c.label && c.href)
    .slice(0, 4);

  const hasContent = Boolean(
    sku || fitment.length || material || included || specs.length || neighbors.length
  );

  return { sku, fitment, material, included, specs, neighbors, hasContent };
}
