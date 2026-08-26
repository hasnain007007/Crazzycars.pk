import { dbConnect } from "@/lib/db";
import Category from "@/lib/models/Category.model";
import { aliasedCategorySlug, normalizeCategoryHandle } from "@/lib/categoryHandleAliases";

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function findActiveCategorySlug(filter) {
  const row = await Category.findOne({ status: "active", ...filter })
    .select("slug")
    .lean();
  return row?.slug ? String(row.slug) : null;
}

/**
 * Map a URL handle to the live category slug, or null if none exists.
 * Order: static alias → exact slug → shopifyHandle → plural → unique prefix.
 */
export async function resolveCategoryHandle(rawHandle) {
  const handle = normalizeCategoryHandle(rawHandle);
  if (!handle) return null;

  await dbConnect();

  const alias = aliasedCategorySlug(handle);
  if (alias) {
    const fromAlias = await findActiveCategorySlug({ slug: alias });
    if (fromAlias) return fromAlias;
  }

  const ci = { $regex: `^${escapeRegex(handle)}$`, $options: "i" };

  const exact =
    (await findActiveCategorySlug({ slug: ci })) ||
    (await findActiveCategorySlug({ shopifyHandle: ci }));
  if (exact) return exact;

  if (!handle.endsWith("s")) {
    const plural = await findActiveCategorySlug({
      $or: [{ slug: `${handle}s` }, { shopifyHandle: `${handle}s` }],
    });
    if (plural) return plural;
  }

  const prefixHits = await Category.find({
    status: "active",
    slug: { $regex: `^${escapeRegex(handle)}(-|$)`, $options: "i" },
  })
    .select("slug")
    .limit(5)
    .lean();
  if (prefixHits.length === 1 && prefixHits[0]?.slug) return String(prefixHits[0].slug);

  const handlePrefixHits = await Category.find({
    status: "active",
    shopifyHandle: { $regex: `^${escapeRegex(handle)}(-|$)`, $options: "i" },
  })
    .select("slug")
    .limit(5)
    .lean();
  if (handlePrefixHits.length === 1 && handlePrefixHits[0]?.slug) {
    return String(handlePrefixHits[0].slug);
  }

  return null;
}
