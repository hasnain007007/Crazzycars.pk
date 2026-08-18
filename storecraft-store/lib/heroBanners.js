import { dbConnect } from "@/lib/db";
import Banner from "@/lib/models/Banner.model";
import { mapBannerToSlide } from "@/lib/heroBannerDisplay";

export {
  cssObjectPosition,
  normalizeImageDisplay,
  heroHeightStyle,
  mapBannerToSlide,
} from "@/lib/heroBannerDisplay";

function isActiveStatus(status) {
  const s = String(status || "").trim().toLowerCase();
  return s === "active" || s === "published";
}

/** SSR: load active hero slider banners (no client waterfall). */
export async function getHeroSlides() {
  try {
    await dbConnect();
    const rows = await Banner.find({
      status: { $regex: /^(active|published)$/i },
      placement: "hero_slider",
    })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    return rows
      .filter((row) => isActiveStatus(row.status))
      .map(mapBannerToSlide)
      .filter((s) => s.title || s.imageUrl);
  } catch (e) {
    console.error("getHeroSlides:", e);
    return [];
  }
}
