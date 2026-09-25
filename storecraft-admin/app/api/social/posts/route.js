/**
 * POST /api/social/posts — create draft SocialPost (step 1 minimal).
 * GET /api/social/posts — list recent posts.
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessAnyCapability } from "@/lib/denyCapability";
import SocialPost from "@/lib/models/SocialPost.model";
import { warnSocialConfigOnce } from "@/lib/social/config";

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

export async function GET(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessAnyCapability(user, ["canManageContent", "canManageSettings"]);
    if (denied) return denied;

    await dbConnect();
    warnSocialConfigOnce();
    const { searchParams } = new URL(request.url);
    const status = String(searchParams.get("status") || "").trim();
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
    const filter = {};
    if (status) filter.status = status;

    const rows = await SocialPost.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
    return NextResponse.json({
      success: true,
      posts: rows.map(serializePost),
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessAnyCapability(user, ["canManageContent", "canManageSettings"]);
    if (denied) return denied;

    const body = await request.json().catch(() => ({}));
    const title = String(body.title || "").trim();
    if (!title) {
      return NextResponse.json({ success: false, error: "title is required" }, { status: 400 });
    }

    await dbConnect();
    const productId = String(body.productId || body.product || "").trim();
    const post = await SocialPost.create({
      title: title.slice(0, 200),
      product:
        productId && mongoose.Types.ObjectId.isValid(productId) ? productId : null,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      platforms: {
        facebook: body.platforms?.facebook !== false,
        instagram: body.platforms?.instagram !== false,
        tiktok: body.platforms?.tiktok !== false,
      },
      captions: {
        facebook: String(body.captions?.facebook || ""),
        instagram: String(body.captions?.instagram || ""),
        tiktok: String(body.captions?.tiktok || ""),
      },
      hashtags: {
        facebook: String(body.hashtags?.facebook || ""),
        instagram: String(body.hashtags?.instagram || ""),
        tiktok: String(body.hashtags?.tiktok || ""),
      },
      firstComment: String(body.firstComment || "").slice(0, 2000),
      status: "draft",
      createdBy: user.userId || user.id || user._id || null,
    });
    post.pushLog("info", "Draft created");
    await post.save();

    return NextResponse.json({ success: true, post: serializePost(post) }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Could not create post" },
      { status: 500 }
    );
  }
}
