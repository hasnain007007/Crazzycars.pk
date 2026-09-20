/**
 * Resolve crawlable /cars/{slug} links for a product's fitment rows.
 * Prefer compatibleVehicles ObjectIds; fall back to Vehicle make/model/year match.
 */
import Vehicle from "@/lib/models/Vehicle.model";
export { carLinkForFitmentRow } from "@/lib/seo/carLinkMatch";

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function yearsOverlap(aFrom, aTo, bFrom, bTo) {
  const a1 = Number(aFrom);
  const a2 = Number(aTo) || a1;
  const b1 = Number(bFrom);
  const b2 = Number(bTo) || b1;
  if (![a1, a2, b1, b2].every(Number.isFinite)) return true;
  return a1 <= b2 && b1 <= a2;
}

/**
 * @param {object} product lean product with compatibleVehicles and/or vehicleCompatibility
 * @returns {Promise<{ slug: string, label: string, make?: string, model?: string, yearFrom?: number, yearTo?: number }[]>}
 */
export async function resolveProductCarLinks(product) {
  const out = [];
  const seen = new Set();

  const push = (slug, label, meta = {}) => {
    const s = String(slug || "").trim();
    if (!s || seen.has(s)) return;
    seen.add(s);
    out.push({
      slug: s,
      href: `/cars/${s}`,
      label: String(label || s).trim(),
      ...meta,
    });
  };

  const linked = Array.isArray(product?.compatibleVehicles)
    ? product.compatibleVehicles
    : [];
  for (const v of linked) {
    if (v && typeof v === "object" && v.slug) {
      push(v.slug, v.displayName || `${v.make || ""} ${v.model || ""}`.trim(), {
        make: v.make,
        model: v.model,
        yearFrom: v.yearFrom,
        yearTo: v.yearTo,
      });
    }
  }

  const rows = product?.vehicleCompatibility?.vehicles;
  if (!Array.isArray(rows) || !rows.length) return out;

  // If we already have ObjectId links, still try to annotate rows; only fetch
  // fallbacks when some VC rows are not covered.
  const needFallback = linked.every((v) => !v || typeof v !== "object" || !v.slug);
  if (!needFallback && out.length) {
    return out;
  }

  const makes = [...new Set(rows.map((r) => String(r.make || "").trim()).filter(Boolean))];
  if (!makes.length) return out;

  const vehicles = await Vehicle.find({
    isActive: { $ne: false },
    make: { $in: makes },
  })
    .select("slug displayName make model yearFrom yearTo")
    .lean();

  for (const row of rows) {
    const makeN = norm(row.make);
    const modelN = norm(row.model);
    if (!makeN) continue;

    // Chassis-code rows like E170–E210 → match Corolla E170 vehicle pages
    const chassisHint = /e170|e210|e140/i.test(String(row.model || ""));

    const matches = (vehicles || []).filter((v) => {
      if (norm(v.make) !== makeN) return false;
      if (!yearsOverlap(row.yearFrom, row.yearTo, v.yearFrom, v.yearTo)) return false;
      const vm = norm(v.model);
      const vd = norm(v.displayName);
      if (modelN && (vm === modelN || vd.includes(modelN) || modelN.includes(vm))) return true;
      if (chassisHint && /corolla/i.test(vd) && /e170|e210|e140/i.test(`${vm} ${vd} ${v.slug}`)) {
        return true;
      }
      return false;
    });

    for (const v of matches) {
      push(v.slug, v.displayName || `${v.make} ${v.model}`, {
        make: v.make,
        model: v.model,
        yearFrom: v.yearFrom,
        yearTo: v.yearTo,
      });
    }
  }

  return out;
}
