import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessMinRole } from "@/lib/requireRole";
import Banner from "@/lib/models/Banner.model";
import { requestIp } from "@/lib/requestIp";

export async function GET(request, context) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }
    await dbConnect();
    const doc = await Banner.findById(id).lean();
    if (!doc) return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    return NextResponse.json({ success: true, banner: doc });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load banner." },
      { status: 500 }
    );
  }
}

export async function PUT(request, context) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessMinRole(user, "editor");
    if (denied) return denied;
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }
    await dbConnect();
    const doc = await Banner.findById(id);
    if (!doc) return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    const body = await request.json();
    if (body.name !== undefined) doc.name = String(body.name || "").trim();
    if (body.placement !== undefined) doc.placement = body.placement || "hero_slider";
    if (body.size !== undefined) doc.size = body.size || "full_width";
    if (body.background !== undefined || body.image !== undefined) {
      doc.background = {
        type: body.background?.type || doc.background?.type || "image",
        image: {
          url: String(body.background?.image?.url || body.image?.url || doc.background?.image?.url || ""),
          publicId: String(body.background?.image?.publicId || body.image?.publicId || doc.background?.image?.publicId || ""),
          imageName: String(body.background?.image?.imageName || doc.background?.image?.imageName || ""),
          altText: String(body.background?.image?.altText || doc.background?.image?.altText || ""),
        },
        mobileImage: {
          url: String(body.background?.mobileImage?.url || doc.background?.mobileImage?.url || ""),
          publicId: String(body.background?.mobileImage?.publicId || doc.background?.mobileImage?.publicId || ""),
        },
        mobileImagePosition: String(
          body.background?.mobileImagePosition || doc.background?.mobileImagePosition || "center center"
        ),
        color: String(body.background?.color || doc.background?.color || "#111111"),
        gradientFrom: String(body.background?.gradientFrom || doc.background?.gradientFrom || "#009688"),
        gradientTo: String(body.background?.gradientTo || doc.background?.gradientTo || "#004d40"),
        gradientDirection: String(body.background?.gradientDirection || doc.background?.gradientDirection || "to right"),
      };
    }
    if (body.imageDisplay !== undefined) {
      doc.imageDisplay = {
        objectFit: body.imageDisplay?.objectFit || doc.imageDisplay?.objectFit || "cover",
        objectPosition: body.imageDisplay?.objectPosition || doc.imageDisplay?.objectPosition || "center",
        height: body.imageDisplay?.height || doc.imageDisplay?.height || "large",
        overlay: {
          enabled: body.imageDisplay?.overlay?.enabled ?? doc.imageDisplay?.overlay?.enabled ?? false,
          color: body.imageDisplay?.overlay?.color || doc.imageDisplay?.overlay?.color || "rgba(0,0,0,0.3)",
          opacity: Number(body.imageDisplay?.overlay?.opacity ?? doc.imageDisplay?.overlay?.opacity ?? 30),
        },
        hoverZoom: body.imageDisplay?.hoverZoom ?? doc.imageDisplay?.hoverZoom ?? false,
      };
    }
    if (body.content !== undefined) {
      const subheadings = Array.isArray(body.content?.subheadings)
        ? body.content.subheadings.map((s) => String(s ?? ""))
        : [];
      doc.content = {
        ...doc.content?.toObject?.(),
        ...body.content,
        subheadings,
        subheading: {
          ...(body.content?.subheading || doc.content?.subheading || {}),
          text: subheadings[0] || String(body.content?.subheading?.text || "").trim(),
        },
        buttons: Array.isArray(body.content?.buttons)
          ? body.content.buttons.slice(0, 4)
          : doc.content?.buttons || [],
      };
    }
    if (body.targetUrl !== undefined || body.linkUrl !== undefined) {
      doc.targetUrl = String(body.targetUrl || body.linkUrl || "").trim();
    }
    if (body.openInNewTab !== undefined) doc.openInNewTab = Boolean(body.openInNewTab);
    if (body.sortOrder !== undefined) doc.sortOrder = Number(body.sortOrder) || 0;
    if (body.status !== undefined) doc.status = body.status === "inactive" ? "inactive" : "active";
    if (body.schedule !== undefined) {
      doc.schedule = {
        enabled: Boolean(body.schedule?.enabled),
        startDate: body.schedule?.startDate || null,
        endDate: body.schedule?.endDate || null,
      };
    }
    if (body.mobileCustomHtml !== undefined) {
      doc.mobileCustomHtml = String(body.mobileCustomHtml || "");
    }
    await doc.save();
    await logActivity({
      user: user.userId,
      userName: user.name || "Admin",
      action: `Banner updated: ${doc.name}`,
      resource: "Banner",
      resourceId: id,
      type: "banner",
      ip: requestIp(request),
    });
    return NextResponse.json({ success: true, banner: doc.toObject() });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Update failed." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessMinRole(user, "editor");
    if (denied) return denied;
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }
    await dbConnect();
    const doc = await Banner.findById(id);
    if (!doc) return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    await Banner.deleteOne({ _id: id });
    await logActivity({
      user: user.userId,
      userName: user.name || "Admin",
      action: `Banner deleted: ${doc.name}`,
      resource: "Banner",
      resourceId: id,
      type: "delete",
      ip: requestIp(request),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Delete failed." },
      { status: 500 }
    );
  }
}
