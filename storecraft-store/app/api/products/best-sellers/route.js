import { NextResponse } from "next/server";
import { fetchHotDealsServer } from "@/lib/serverHotDeals";
import { fetchBestSellersServer } from "@/lib/serverBestSellers";

/**
 * Full Best Sellers row for the homepage "Show more" button. Uses the same exclusion as the
 * server-rendered row (the first 24 Hot Deals), so the first cards match what is already shown.
 */
export async function GET() {
  try {
    const deals = await fetchHotDealsServer({ filter: "all", limit: 24 });
    const products = await fetchBestSellersServer({
      limit: 500,
      excludeIds: (deals || []).map((d) => d.id || d._id).filter(Boolean),
    });
    return NextResponse.json(
      { success: true, products, total: products.length },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed to load best sellers." }, { status: 500 });
  }
}
