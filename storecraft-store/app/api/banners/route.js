import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Banner from "@/lib/models/Banner.model";

export const dynamic = "force-dynamic";

const PLACEMENTS = ["hero_slider", "promo_strip", "promo_card", "popup_banner"];

function isActiveStatus(status) {
  const s = String(status || "").trim().toLowerCase();
  return s === "active" || s === "published";
}

function normalizePlacement(placement) {
  const p = String(placement || "hero_slider").trim();
  return PLACEMENTS.includes(p) ? p : p;
}

function serializeBanner(doc) {
  const b = doc && typeof doc === "object" ? doc : {};
  const bg = b.background && typeof b.background === "object" ? b.background : {};
  const content = b.content && typeof b.content === "object" ? b.content : {};

  return {
    _id: b._id?.toString?.() || String(b._id || ""),
    id: b._id?.toString?.() || String(b._id || ""),
    name: b.name || "",
    placement: normalizePlacement(b.placement),
    size: b.size || "full_width",
    status: b.status || "active",
    background: {
      type: bg.type || "image",
      color: bg.color || "#111111",
      gradientFrom: bg.gradientFrom || "",
      gradientTo: bg.gradientTo || "",
      gradientDirection: bg.gradientDirection || "to right",
      mobileImagePosition: bg.mobileImagePosition || "center center",
      image: {
        url: bg.image?.url || "",
        publicId: bg.image?.publicId || "",
        altText: bg.image?.altText || "",
      },
      mobileImage: {
        url: bg.mobileImage?.url || "",
        publicId: bg.mobileImage?.publicId || "",
      },
    },
    imageDisplay: b.imageDisplay || {},
    content: {
      badge: content.badge || {},
      heading: {
        text: content.heading?.text || "",
        size: content.heading?.size || "xl",
        color: content.heading?.color || "#ffffff",
        fontWeight: content.heading?.fontWeight || "bold",
      },
      subheading: {
        text: content.subheading?.text || "",
        color: content.subheading?.color || "#ffffff",
      },
      subheadings: Array.isArray(content.subheadings)
        ? content.subheadings.map((s) => String(s ?? ""))
        : [],
      description: content.description || {},
      buttons: Array.isArray(content.buttons)
        ? content.buttons.map((btn) => ({
            text: btn?.text || "",
            url: btn?.url || "",
            link: btn?.link || "",
            style: btn?.style || "primary",
            bgColor: btn?.bgColor || "",
            textColor: btn?.textColor || btn?.color || "",
          }))
        : [],
      contentPosition: content.contentPosition || "left",
      overlay: content.overlay || {},
    },
    targetUrl: b.targetUrl || "",
    openInNewTab: Boolean(b.openInNewTab),
    sortOrder: Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : 0,
    schedule: b.schedule || { enabled: false },
  };
}

function sortByOrder(a, b) {
  return (a.sortOrder || 0) - (b.sortOrder || 0);
}

export async function GET() {
  try {
    await dbConnect();

    const rows = await Banner.find({
      status: { $regex: /^active$/i },
    })
      .sort({ sortOrder: 1 })
      .lean();

    const banners = rows
      .filter((row) => isActiveStatus(row.status))
      .map(serializeBanner)
      .sort(sortByOrder);

    const group = (placement) =>
      banners.filter((b) => b.placement === placement).sort(sortByOrder);

    return NextResponse.json(
      {
        success: true,
        hero_slider: group("hero_slider"),
        promo_strip: group("promo_strip"),
        promo_card: group("promo_card"),
        popup_banner: group("popup_banner"),
        all: banners,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Failed to load banners." },
      { status: 500 }
    );
  }
}
