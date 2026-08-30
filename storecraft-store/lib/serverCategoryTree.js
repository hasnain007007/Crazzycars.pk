/**
 * SSR category tree for layout header / mega-menu / footer.
 * React.cache() dedupes within a single request (layout + any other caller).
 */
import { cache } from "react";
import { dbConnect } from "@/lib/db";
import { isPostgresCatalog } from "@/lib/pg/enabled";
import {
  loadStoreCategoriesTreeSlim,
  serializeCategoryTreeNode,
} from "@/lib/storeCategoryData";
import {
  getCachedCategoryTreePayload,
  setCachedCategoryTreePayload,
} from "@/lib/categoryTreeServerCache";

export const fetchCategoryTreeServer = cache(async () => {
  try {
    const cached = getCachedCategoryTreePayload();
    if (cached) return cached;

    // Postgres catalog does not need a Mongo connection for the category tree.
    if (!isPostgresCatalog()) await dbConnect();
    const tree = await loadStoreCategoriesTreeSlim();
    const payload = (Array.isArray(tree) ? tree : []).map(serializeCategoryTreeNode);
    setCachedCategoryTreePayload(payload);
    return payload;
  } catch (err) {
    console.error("[fetchCategoryTreeServer]", err?.message || err);
    return [];
  }
});
