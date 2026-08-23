import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import FeaturedMedia from "@/lib/models/FeaturedMedia.model";

export async function GET(request) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const items = await FeaturedMedia.find({}).sort({ sortOrder: 1, createdAt: -1 }).lean();
    return NextResponse.json({
      success: true,
      items: JSON.parse(JSON.stringify(items)),
      data: JSON.parse(JSON.stringify(items)),
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed to load media." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canManageContent");
    if (denied) return denied;
    await dbConnect();
    const body = await request.json();
    const item = await FeaturedMedia.create({
      title: String(body.title || "").trim(),
      type: body.type === "video" ? "video" : "image",
      mediaUrl: String(body.mediaUrl || "").trim(),
      thumbnailUrl: String(body.thumbnailUrl || body.mediaUrl || "").trim(),
      link: String(body.link || "").trim(),
      linkType: ["product", "category", "page", "url", "none"].includes(body.linkType) ? body.linkType : "none",
      caption: String(body.caption || "").trim(),
      enabled: body.enabled !== false,
      sortOrder: Number(body.sortOrder) || 0,
    });
    return NextResponse.json({
      success: true,
      item: JSON.parse(JSON.stringify(item.toObject())),
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Create failed." }, { status: 500 });
  }
}
