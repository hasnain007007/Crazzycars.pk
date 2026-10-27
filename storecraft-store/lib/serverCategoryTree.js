/**
 * SSR category tree for layout header / mega-menu / footer.
 * React.cache() dedupes within a single request (layout + any other caller).
 */
import { filterCategoryTreeBySegment } from "@/lib/segment";
import { cache } from "react";
import { dbConnect } from "@/lib/db";
import {
  getCategoryIdsWithProducts,
  loadStoreCategoriesTreeSlim,
  pruneCategoryTreeWithoutProducts,
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

    await dbConnect();
    const [tree, withProducts] = await Promise.all([
      loadStoreCategoriesTreeSlim(),
      getCategoryIdsWithProducts(),
    ]);
    // Website menus are the car store; bike categories appear only in the app until /bikes ships.
    const payload = filterCategoryTreeBySegment(
      pruneCategoryTreeWithoutProducts(
        (Array.isArray(tree) ? tree : []).map(serializeCategoryTreeNode),
        withProducts
      ),
      "car"
    );
    setCachedCategoryTreePayload(payload);
    return payload;
  } catch (err) {
    console.error("[fetchCategoryTreeServer]", err?.message || err);
    return [];
  }
});
