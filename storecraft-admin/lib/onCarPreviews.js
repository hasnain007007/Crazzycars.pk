/** Clean "See it on your car" rows from the product editor: car name + image required. */
export function normalizeOnCarPreviews(rows) {
  if (!Array.isArray(rows)) return [];
  const out = [];
  for (const r of rows) {
    const car = String(r?.car || "").trim().slice(0, 80);
    const image = String(r?.image || "").trim();
    if (!car || !image) continue;
    if (!/^(https?:\/\/|\/)/i.test(image)) continue;
    out.push({
      car,
      vehicleSlug: String(r?.vehicleSlug || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .slice(0, 120),
      image,
      aiGenerated: r?.aiGenerated === true,
    });
    if (out.length >= 20) break;
  }
  return out;
}
