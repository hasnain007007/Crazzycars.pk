import { dbConnect } from "@/lib/db";
import Banner from "@/lib/models/Banner.model";
import { heroImageUrl } from "@/lib/cloudinaryImage";

function isActiveStatus(status) {
  const s = String(status || "").trim().toLowerCase();
  return s === "active" || s === "published";
}

/** Map DB/API banner → homepage slide (optimized image URL). */
export function mapBannerToSlide(banner) {
  const rawUrl = String(banner?.background?.image?.url || "").trim() || null;
  const imageUrl = rawUrl ? heroImageUrl(rawUrl) : null;
  const title = String(banner?.content?.heading?.text || "").trim();
  const subtitle = String(banner?.content?.subheading?.text || "").trim();
  const rawButtons = Array.isArray(banner?.content?.buttons) ? banner.content.buttons : [];
  const buttons = rawButtons.map((btn) => ({
    text: btn?.text || "",
    url: btn?.url || btn?.link || banner?.targetUrl || "/shop",
    bgColor: btn?.bgColor || "",
    textColor: btn?.textColor || btn?.color || "",
    style: btn?.style || "primary",
  }));

  return {
    id: banner?._id?.toString?.() || banner?.id || title || "hero",
    title,
    subtitle,
    imageUrl,
    imageUrlRaw: rawUrl,
    buttons,
    backgroundColor: banner?.background?.color || "#111111",
    textColor: banner?.content?.heading?.color || "#FFFFFF",
    subColor: banner?.content?.subheading?.color || "#9CA3AF",
  };
}

/** SSR: load active hero slider banners (no client waterfall). */
export async function getHeroSlides() {
  try {
    await dbConnect();
    const rows = await Banner.find({
      status: { $regex: /^active$/i },
      placement: "hero_slider",
    })
      .sort({ sortOrder: 1 })
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
