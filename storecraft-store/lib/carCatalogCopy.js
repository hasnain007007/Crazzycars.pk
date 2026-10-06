/**
 * Pure Car Catalog copy helpers (no DB) — exact slug/id binding only.
 */

/**
 * Exact Car Catalog model match by nested model.slug (case-insensitive).
 * Never matches on bare make/model/nickname — those collide across generations.
 * @param {Array<object>} makes
 * @param {string} slug
 * @returns {{ make: object, model: object } | null}
 */
export function findCatalogModelByExactSlug(makes, slug) {
  const want = String(slug || "")
    .trim()
    .toLowerCase();
  if (!want || !Array.isArray(makes)) return null;
  for (const make of makes) {
    for (const model of make?.models || []) {
      if (model?.isActive === false) continue;
      if (String(model?.slug || "").trim().toLowerCase() === want) {
        return { make, model };
      }
    }
  }
  return null;
}

/**
 * Exact Car Catalog model match by nested model ObjectId.
 * @param {Array<object>} makes
 * @param {string} id
 */
export function findCatalogModelByExactId(makes, id) {
  const want = id != null ? String(id).trim() : "";
  if (!want || !Array.isArray(makes)) return null;
  for (const make of makes) {
    for (const model of make?.models || []) {
      if (model?.isActive === false) continue;
      const mid =
        model?._id != null ? String(model._id) : model?.id != null ? String(model.id) : "";
      if (mid && mid === want) return { make, model };
    }
  }
  return null;
}

/**
 * Apply catalog SEO fields onto a vehicle page payload.
 * Long Description from catalog wins when non-empty; never invent sibling copy.
 */
export function mergeCatalogCopyOntoVehicle(vehicle, model) {
  if (!vehicle || typeof vehicle !== "object") return vehicle;
  if (!model || typeof model !== "object") return vehicle;

  const description = String(model.description || "").trim();
  const popularAccessories = Array.isArray(model.popularAccessories)
    ? model.popularAccessories.map((s) => String(s || "").trim()).filter(Boolean)
    : [];
  const nickname = String(model.nickname || "").trim();

  return {
    ...vehicle,
    // Only the catalog row's description — empty means page may use short meta fallback.
    description,
    popularAccessories: popularAccessories.length
      ? popularAccessories
      : Array.isArray(vehicle.popularAccessories)
        ? vehicle.popularAccessories
        : [],
    nickname: nickname || String(vehicle.nickname || "").trim() || "",
    image: String(vehicle.image || "").trim() || String(model.image || "").trim() || "",
    catalogModelSlug:
      String(model.slug || "").trim().toLowerCase() ||
      String(vehicle.catalogModelSlug || "").trim().toLowerCase() ||
      "",
  };
}
