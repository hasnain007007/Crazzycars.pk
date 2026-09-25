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
import { serializeSocialPost as serializePost, platformsFromInput } from "@/lib/social/serializePost";
import { weekStartPkt, addDaysUtc } from "@/lib/social/pktTime";
import { normalizeHashtagList } from "@/lib/social/captions";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessAnyCapability(user, ["canManageContent", "canManageSettings"]);
    if (denied) return denied;

    await dbConnect();
    warnSocialConfigOnce();
    const { searchParams } = new URL(request.url);
    const status = String(searchParams.get("status") || "").trim();
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
    const filter = {};
    if (status) {
      if (status === "posting") filter.status = { $in: ["posting", "publishing"] };
      else if (status === "posted") filter.status = { $in: ["posted", "published"] };
      else filter.status = status;
    }
    const week = searchParams.get("week");
    let from = searchParams.get("from") || searchParams.get("scheduledFrom");
    let to = searchParams.get("to") || searchParams.get("scheduledTo");
    if (week) {
      const ws = weekStartPkt(new Date(week));
      from = ws.toISOString();
      to = addDaysUtc(ws, 7).toISOString();
    }
    if (from || to) {
      filter.scheduledAt = {};
      if (from) filter.scheduledAt.$gte = new Date(from);
      if (to) filter.scheduledAt.$lte = new Date(to);
    }

    const sort = from || to ? { scheduledAt: 1 } : { createdAt: -1 };
    const rows = await SocialPost.find(filter).sort(sort).limit(limit).lean();
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
    const title = String(body.title || body.headline || "").trim();
    if (!title) {
      return NextResponse.json({ success: false, error: "title is required" }, { status: 400 });
    }

    await dbConnect();
    const productId = String(body.productId || body.product || "").trim();
    const platforms = Array.isArray(body.platforms)
      ? platformsFromInput(body.platforms)
      : {
          facebook: body.platforms?.facebook !== false,
          instagram: body.platforms?.instagram !== false,
          tiktok: Boolean(body.platforms?.tiktok),
        };
    const caption = String(body.caption || body.captions?.instagram || "");
    const hashtagList = normalizeHashtagList(body.hashtagList || body.hashtags || []);
    const status =
      body.status === "scheduled" && body.scheduledAt ? "scheduled" : "draft";

    const post = await SocialPost.create({
      title: title.slice(0, 200),
      headline: String(body.headline || title).slice(0, 60),
      product:
        productId && mongoose.Types.ObjectId.isValid(productId) ? productId : null,
      productUrl: String(body.productUrl || "").trim(),
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      platforms,
      caption,
      captionTiktok: String(body.captionTiktok || ""),
      captions: {
        facebook: caption || String(body.captions?.facebook || ""),
        instagram: caption || String(body.captions?.instagram || ""),
        tiktok: String(body.captionTiktok || body.captions?.tiktok || caption),
      },
      hashtagList,
      hashtags: {
        facebook: hashtagList.join(" "),
        instagram: hashtagList.join(" "),
        tiktok: hashtagList.join(" "),
      },
      firstComment: String(body.firstComment || "").slice(0, 2000),
      addFooter: body.addFooter !== false,
      status,
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
