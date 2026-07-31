import { dbConnect } from "@/lib/db";
import Category from "@/lib/models/Category.model";
import Vehicle from "@/lib/models/Vehicle.model";

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeHandle(raw) {
  return String(raw || "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();
}

/**
 * Resolve a Shopify-era /collections/:handle to a canonical site path.
 * Order: category shopifyHandle → category slug → vehicle handle/slug prefix.
 * @returns {Promise<string>} absolute path starting with /
 */
export async function resolveCollectionHandleToPath(rawHandle) {
  const handle = normalizeHandle(rawHandle);
  if (!handle) return "/categories";

  // Shopify system collections
  if (handle === "all" || handle === "frontpage") return "/products";
  if (handle === "vendors" || handle === "types") return "/categories";

  try {
    await dbConnect();

    const ci = { $regex: `^${escapeRegex(handle)}$`, $options: "i" };

    const category =
      (await Category.findOne({
        status: { $regex: /^active$/i },
        shopifyHandle: ci,
      })
        .select("slug")
        .lean()) ||
      (await Category.findOne({
        status: { $regex: /^active$/i },
        slug: ci,
      })
        .select("slug")
        .lean());

    if (category?.slug) return `/categories/${category.slug}`;

    // interior-light → interior-lights (common Shopify plural drift)
    if (!handle.endsWith("s")) {
      const plural = await Category.findOne({
        status: { $regex: /^active$/i },
        $or: [{ slug: `${handle}s` }, { shopifyHandle: `${handle}s` }],
      })
        .select("slug")
        .lean();
      if (plural?.slug) return `/categories/${plural.slug}`;
    }

    const vehicleExact =
      (await Vehicle.findOne({
        isActive: { $ne: false },
        shopifyHandle: ci,
      })
        .select("slug")
        .lean()) ||
      (await Vehicle.findOne({
        isActive: { $ne: false },
        slug: ci,
      })
        .select("slug")
        .lean());
    if (vehicleExact?.slug) return `/cars/${vehicleExact.slug}`;

    // honda-city → honda-city-2021-present (Shopify vehicle collection → generation slug)
    const vehiclePrefix = await Vehicle.find({
      isActive: { $ne: false },
      slug: { $regex: `^${escapeRegex(handle)}(-|$)`, $options: "i" },
    })
      .select("slug yearTo yearFrom")
      .sort({ yearTo: -1, yearFrom: -1 })
      .limit(5)
      .lean();
    if (vehiclePrefix.length === 1) return `/cars/${vehiclePrefix[0].slug}`;
    if (vehiclePrefix.length > 1) {
      // Prefer the newest generation when Shopify used a short make-model handle
      return `/cars/${vehiclePrefix[0].slug}`;
    }
  } catch (err) {
    console.error("[resolveCollectionHandleToPath]", err?.message || err);
  }

  return "/categories";
}
