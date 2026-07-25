import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessMinRole } from "@/lib/requireRole";
import FeaturedMedia from "@/lib/models/FeaturedMedia.model";

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
    const body = await request.json();
    const patch = { ...body };
    delete patch._id;
    if (patch.title !== undefined) patch.title = String(patch.title || "").trim();
    if (patch.mediaUrl !== undefined) patch.mediaUrl = String(patch.mediaUrl || "").trim();
    if (patch.thumbnailUrl !== undefined) patch.thumbnailUrl = String(patch.thumbnailUrl || "").trim();
    if (patch.link !== undefined) patch.link = String(patch.link || "").trim();
    if (patch.caption !== undefined) patch.caption = String(patch.caption || "").trim();
    if (patch.type !== undefined) patch.type = patch.type === "video" ? "video" : "image";
    if (patch.linkType !== undefined && !["product", "category", "page", "url", "none"].includes(patch.linkType)) {
      delete patch.linkType;
    }
    if (patch.sortOrder !== undefined) patch.sortOrder = Number(patch.sortOrder) || 0;
    if (patch.enabled !== undefined) patch.enabled = Boolean(patch.enabled);

    const item = await FeaturedMedia.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean();
    if (!item) return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    return NextResponse.json({
      success: true,
      item: JSON.parse(JSON.stringify(item)),
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Update failed." }, { status: 500 });
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
    const res = await FeaturedMedia.findByIdAndDelete(id);
    if (!res) return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Delete failed." }, { status: 500 });
  }
}
