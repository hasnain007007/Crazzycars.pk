import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { countByPlace, liveSinceDate, networkLabel, pageLabel, placeLabel, slugsFromPaths } from "@/lib/livePresence";
import LivePresence from "@/lib/models/LivePresence.model";
import Product from "@/lib/models/Product.model";
import Category from "@/lib/models/Category.model";
import { storeBaseUrl } from "@/lib/siteCheck";

/**
 * Live storefront visitors for Admin › Dashboard: who is on the site now, from which city,
 * which page they are on, where they landed and where they came from.
 * IPs and session ids are never returned.
 */
export async function GET(request) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const now = new Date();
    const rows = await LivePresence.find({ lastSeen: { $gte: liveSinceDate(now) } })
      .select(
        "path landingPath lastSeen firstSeen createdAt city region country countryCode network device userAgent source pageViews"
      )
      .sort({ lastSeen: -1 })
      .limit(200)
      .lean();

    const { products, categories } = slugsFromPaths(rows.flatMap((r) => [r.path, r.landingPath]));
    const [productDocs, categoryDocs] = await Promise.all([
      products.length ? Product.find({ slug: { $in: products } }).select("slug name").lean() : [],
      categories.length ? Category.find({ slug: { $in: categories } }).select("slug name").lean() : [],
    ]);
    const names = {
      products: Object.fromEntries(productDocs.map((p) => [p.slug, p.name])),
      categories: Object.fromEntries(categoryDocs.map((c) => [c.slug, c.name])),
    };

    const base = storeBaseUrl();
    const visitors = rows.map((r, i) => {
      const firstSeen = r.firstSeen || r.createdAt || r.lastSeen;
      const now_ = pageLabel(r.path, names);
      const landing = pageLabel(r.landingPath || r.path, names);
      return {
        id: `v${i}`,
        place: placeLabel(r),
        city: r.city || "",
        region: r.region || "",
        country: r.country || "",
        countryCode: r.countryCode || "",
        network: networkLabel(r.network),
        device: r.device || "",
        source: r.source || "",
        nowPath: r.path || "/",
        nowLabel: now_.label,
        nowKind: now_.kind,
        nowUrl: `${base}${r.path || "/"}`,
        landingPath: r.landingPath || r.path || "/",
        landingLabel: landing.label,
        landingUrl: `${base}${r.landingPath || r.path || "/"}`,
        pageViews: Math.max(1, Number(r.pageViews) || 0),
        onSiteSec: Math.max(0, Math.round((now - new Date(firstSeen)) / 1000)),
        lastSeenSec: Math.max(0, Math.round((now - new Date(r.lastSeen)) / 1000)),
      };
    });

    const pathCounts = {};
    for (const v of visitors) {
      const key = v.nowPath;
      pathCounts[key] = pathCounts[key] || { path: key, label: v.nowLabel, count: 0 };
      pathCounts[key].count += 1;
    }
    const topPaths = Object.values(pathCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return NextResponse.json({
      success: true,
      data: {
        liveUsers: visitors.length,
        visitors,
        places: countByPlace(visitors),
        topPaths,
        onCheckout: visitors.filter((v) => v.nowKind === "checkout").length,
        updatedAt: now.toISOString(),
      },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed." }, { status: 500 });
  }
}
