/**
 * GET/DELETE /api/social/posts/[id]
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessAnyCapability } from "@/lib/denyCapability";
import SocialPost from "@/lib/models/SocialPost.model";
import { deleteSocialPostMedia } from "@/lib/social/imageService";

export const dynamic = "force-dynamic";

function serializePost(doc) {
  if (!doc) return null;
  const o = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    id: String(o._id),
    title: o.title,
    product: o.product ? String(o.product) : null,
    scheduledAt: o.scheduledAt || null,
    platforms: o.platforms || {},
    images: o.images || [],
    captions: o.captions || {},
    hashtags: o.hashtags || {},
    firstComment: o.firstComment || "",
    status: o.status,
    results: o.results || {},
    attempts: o.attempts || 0,
    lastError: o.lastError || "",
    logs: o.logs || [],
    weekPackId: o.weekPackId || "",
    nextRetryAt: o.nextRetryAt || null,
    createdBy: o.createdBy ? String(o.createdBy) : null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

export async function GET(request, context) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessAnyCapability(user, ["canManageContent", "canManageSettings"]);
    if (denied) return denied;
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
    }
    await dbConnect();
    const post = await SocialPost.findById(id).lean();
    if (!post) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, post: serializePost(post) });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed" }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessAnyCapability(user, ["canManageContent", "canManageSettings"]);
    if (denied) return denied;
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
    }
    await dbConnect();
    const post = await SocialPost.findById(id);
    if (!post) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    await deleteSocialPostMedia(post._id);
    await SocialPost.deleteOne({ _id: post._id });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed" }, { status: 500 });
  }
}
