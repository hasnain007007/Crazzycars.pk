/**
 * GET/PATCH/DELETE /api/social/posts/[id]
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessAnyCapability } from "@/lib/denyCapability";
import SocialPost from "@/lib/models/SocialPost.model";
import { deleteSocialPostMedia } from "@/lib/social/imageService";
import { serializeSocialPost as serializePost, platformsFromInput } from "@/lib/social/serializePost";
import { normalizeHashtagList } from "@/lib/social/captions";

export const dynamic = "force-dynamic";

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

export async function PATCH(request, context) {
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
    const body = await request.json().catch(() => ({}));

    if (body.title != null) post.title = String(body.title).slice(0, 200);
    if (body.headline != null) post.headline = String(body.headline).slice(0, 60);
    if (body.caption != null) post.caption = String(body.caption);
    if (body.captionTiktok != null) post.captionTiktok = String(body.captionTiktok).slice(0, 500);
    if (body.firstComment != null) post.firstComment = String(body.firstComment).slice(0, 2000);
    if (body.productUrl != null) post.productUrl = String(body.productUrl).trim();
    if (body.addFooter != null) post.addFooter = Boolean(body.addFooter);
    if (body.scheduledAt !== undefined) {
      post.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    }
    if (body.status != null) {
      const allowed = ["draft", "scheduled", "cancelled"];
      const s = String(body.status);
      if (allowed.includes(s)) post.status = s;
    }
    if (body.platforms != null) {
      post.platforms = Array.isArray(body.platforms)
        ? platformsFromInput(body.platforms)
        : {
            facebook: body.platforms.facebook != null ? Boolean(body.platforms.facebook) : post.platforms?.facebook,
            instagram: body.platforms.instagram != null ? Boolean(body.platforms.instagram) : post.platforms?.instagram,
            tiktok: body.platforms.tiktok != null ? Boolean(body.platforms.tiktok) : post.platforms?.tiktok,
          };
      post.markModified("platforms");
    }
    if (Array.isArray(body.hashtagList)) {
      post.hashtagList = normalizeHashtagList(body.hashtagList);
      post.markModified("hashtagList");
    }
    if (body.captions && typeof body.captions === "object") {
      post.captions = post.captions || {};
      if (body.captions.facebook != null) post.captions.facebook = String(body.captions.facebook);
      if (body.captions.instagram != null) post.captions.instagram = String(body.captions.instagram);
      if (body.captions.tiktok != null) post.captions.tiktok = String(body.captions.tiktok);
      post.markModified("captions");
    }
    if (Array.isArray(body.images)) {
      post.images = body.images.map((img, idx) => ({
        path: String(img.path || ""),
        url: String(img.url || ""),
        width: Number(img.width) || 0,
        height: Number(img.height) || 0,
        order: Number(img.order) || idx + 1,
        originalName: String(img.originalName || ""),
      }));
      post.markModified("images");
    }
    const productId = String(body.productId || body.product || "").trim();
    if (body.productId !== undefined || body.product !== undefined) {
      post.product =
        productId && mongoose.Types.ObjectId.isValid(productId) ? productId : null;
    }
    if (body.scheduledAt && body.status !== "draft") {
      post.status = "scheduled";
    }

    post.pushLog("info", "Updated from admin");
    await post.save();
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
