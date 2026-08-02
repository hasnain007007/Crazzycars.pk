import { NextResponse } from "next/server";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessMinRole } from "@/lib/requireRole";
import Banner from "@/lib/models/Banner.model";
import { requestIp } from "@/lib/requestIp";

export async function GET(request) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const rows = await Banner.find({}).sort({ sortOrder: 1, createdAt: -1 }).lean();
    const banners = rows.map((b) => ({ ...b, id: b._id.toString() }));
    return NextResponse.json({ success: true, banners });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load banners." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessMinRole(user, "editor");
    if (denied) return denied;
    await dbConnect();
    const body = await request.json();
    const maxSort = await Banner.findOne().sort({ sortOrder: -1 }).select("sortOrder").lean();
    const nextOrder = (maxSort?.sortOrder ?? 0) + 1;
    const doc = await Banner.create({
      name: String(body.name || "Banner").trim(),
      placement: body.placement || "hero_slider",
      size: body.size || "full_width",
      background: {
        type: body.background?.type || "image",
        image: {
          url: String(body.background?.image?.url || body.image?.url || ""),
          publicId: String(body.background?.image?.publicId || body.image?.publicId || ""),
        },
        mobileImage: {
          url: String(body.background?.mobileImage?.url || ""),
          publicId: String(body.background?.mobileImage?.publicId || ""),
        },
        mobileImagePosition: String(body.background?.mobileImagePosition || "center center"),
        color: String(body.background?.color || "#111111"),
        gradientFrom: String(body.background?.gradientFrom || "#009688"),
        gradientTo: String(body.background?.gradientTo || "#004d40"),
        gradientDirection: String(body.background?.gradientDirection || "to right"),
      },
      imageDisplay: {
        objectFit: body.imageDisplay?.objectFit || "cover",
        objectPosition: body.imageDisplay?.objectPosition || "center",
        height: body.imageDisplay?.height || "large",
        overlay: {
          enabled: Boolean(body.imageDisplay?.overlay?.enabled),
          color: String(body.imageDisplay?.overlay?.color || "rgba(0,0,0,0.3)"),
          opacity: Number(body.imageDisplay?.overlay?.opacity ?? 30),
        },
        hoverZoom: Boolean(body.imageDisplay?.hoverZoom),
      },
      content: {
        badge: body.content?.badge || {},
        heading: body.content?.heading || {},
        subheading: body.content?.subheading || {},
        subheadings: Array.isArray(body.content?.subheadings)
          ? body.content.subheadings.map((s) => String(s ?? ""))
          : [],
        description: body.content?.description || {},
        buttons: Array.isArray(body.content?.buttons) ? body.content.buttons.slice(0, 2) : [],
        contentPosition: body.content?.contentPosition || "left",
        overlay: body.content?.overlay || {},
      },
      targetUrl: String(body.targetUrl || body.linkUrl || "").trim(),
      openInNewTab: Boolean(body.openInNewTab),
      // Form often sends sortOrder: 0 for new banners — use next slot so slides order correctly.
      sortOrder:
        typeof body.sortOrder === "number" && Number(body.sortOrder) > 0
          ? Number(body.sortOrder)
          : nextOrder,
      status: body.status === "inactive" ? "inactive" : "active",
      schedule: {
        enabled: Boolean(body.schedule?.enabled),
        startDate: body.schedule?.startDate || null,
        endDate: body.schedule?.endDate || null,
      },
      mobileCustomHtml: String(body.mobileCustomHtml || ""),
    });
    await logActivity({
      user: user.userId,
      userName: user.name || "Admin",
      action: `Banner created: ${doc.name}`,
      resource: "Banner",
      resourceId: doc._id.toString(),
      type: "banner",
      ip: requestIp(request),
    });
    return NextResponse.json({ success: true, banner: doc.toObject() });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Create failed." },
      { status: 500 }
    );
  }
}
