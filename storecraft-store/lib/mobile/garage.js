/**
 * My Garage sync helpers (pure, no Mongo) — used by /api/mobile/v1/me/garage.
 */

export const MAX_GARAGE = 10;

function year(v) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1950 && n <= 2100 ? n : null;
}

/** Clean an incoming list: known shape, unique slugs, capped. Pure — exported for tests. */
export function sanitizeGarageInput(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const out = [];
  const seen = new Set();
  for (const item of list) {
    const slug = String(item?.slug || "").trim().toLowerCase();
    if (!slug || slug.length > 120 || !/^[a-z0-9-]+$/.test(slug)) continue;
    const key = `${slug}:${year(item?.yearStart) ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      slug,
      yearStart: year(item?.yearStart),
      yearEnd: year(item?.yearEnd),
      active: item?.active === true,
    });
    if (out.length >= MAX_GARAGE) break;
  }
  return out;
}
