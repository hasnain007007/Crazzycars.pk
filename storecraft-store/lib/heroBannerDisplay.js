import { heroImageUrl, heroImageUrlMobile } from "@/lib/cloudinaryImage";

/** Map admin objectPosition to CSS object-position. */
export function cssObjectPosition(pos) {
  if (!pos) return "center center";
  const s = String(pos).trim();
  if (s.includes(" ")) return s;
  const map = {
    center: "center center",
    top: "top center",
    bottom: "bottom center",
    left: "center left",
    right: "center right",
  };
  return map[s] || s;
}

/** Normalize admin imageDisplay for the storefront hero. */
export function normalizeImageDisplay(raw, { imageOnly = false } = {}) {
  const d = raw && typeof raw === "object" ? raw : {};
  let height = ["small", "medium", "large", "full", "auto"].includes(d.height)
    ? d.height
    : "medium";
  let objectFit = ["cover", "contain", "fill", "none", "scale-down"].includes(d.objectFit)
    ? d.objectFit
    : "cover";

  // "Original" (none) inside a fixed-height box leaves empty/black side panels and clips artwork.
  if (objectFit === "none" && height !== "auto") {
    objectFit = "contain";
  }

  // Designed banners (no HTML heading) already include their own copy — show the full image.
  if (imageOnly) {
    height = "auto";
    objectFit = objectFit === "fill" ? "fill" : "contain";
  }

  const overlay = d.overlay && typeof d.overlay === "object" ? d.overlay : {};
  const opacityPct = Number(overlay.opacity);
  return {
    height,
    objectFit,
    objectPosition: cssObjectPosition(d.objectPosition || "center"),
    hoverZoom: Boolean(d.hoverZoom),
    overlay: {
      enabled: Boolean(overlay.enabled),
      color: String(overlay.color || "rgba(0,0,0,0.4)"),
      opacity: Number.isFinite(opacityPct) ? Math.min(100, Math.max(0, opacityPct)) : 40,
    },
  };
}

/** Section height styles matching admin Banner Height cards. */
export function heroHeightStyle(height) {
  switch (height) {
    case "small":
      return { height: "280px", minHeight: "280px" };
    case "medium":
      return { height: "380px", minHeight: "380px" };
    case "large":
      return { height: "420px", minHeight: "420px" };
    case "full":
      return { height: "100vh", minHeight: "100vh" };
    case "auto":
      return { height: "auto", minHeight: 0 };
    default:
      return { height: "380px", minHeight: "380px" };
  }
}

/** Map DB/API banner → homepage slide (optimized image URL). Client-safe. */
export function mapBannerToSlide(banner) {
  const rawUrl = String(banner?.background?.image?.url || "").trim() || null;
  const mobileRaw =
    String(banner?.background?.mobileImage?.url || banner?.background?.image?.mobileUrl || "").trim() ||
    rawUrl;
  const imageUrl = rawUrl ? heroImageUrl(rawUrl) : null;
  const imageUrlMobile = mobileRaw ? heroImageUrlMobile(mobileRaw) : imageUrl;
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

  const imageOnly = Boolean(rawUrl) && !title && !subtitle;

  return {
    id: banner?._id?.toString?.() || banner?.id || title || "hero",
    title,
    subtitle,
    imageUrl,
    imageUrlMobile,
    imageUrlRaw: rawUrl,
    targetUrl: String(banner?.targetUrl || "").trim(),
    buttons,
    backgroundColor: banner?.background?.color || "#0b0b0b",
    textColor: banner?.content?.heading?.color || "#FFFFFF",
    subColor: banner?.content?.subheading?.color || "#D1D5DB",
    imageDisplay: normalizeImageDisplay(banner?.imageDisplay, { imageOnly }),
  };
}
