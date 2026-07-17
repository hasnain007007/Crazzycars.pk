import { dbConnect } from "@/lib/db";
import { loadStoreCategoriesTree } from "@/lib/storeCategoryData";
import { CategoriesPageClient } from "@/components/store/CategoriesPageClient";

/** SSR — avoids prerender/build without Mongo; list responses remain cacheable via /api/categories. */
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  await dbConnect();
  const tree = await loadStoreCategoriesTree(true);
  const serialized = JSON.parse(JSON.stringify(tree));
  return (
    <div style={{ background: "#0A0A0A", minHeight: "100vh" }}>
      <CategoriesPageClient initialCategories={serialized} />
    </div>
  );
}
