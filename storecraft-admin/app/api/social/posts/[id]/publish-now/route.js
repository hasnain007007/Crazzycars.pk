/**
 * POST /api/social/posts/[id]/publish-now
 * POST /api/social/posts/[id]/retry?platform=ig|fb
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessAnyCapability } from "@/lib/denyCapability";
import SocialPost from "@/lib/models/SocialPost.model";
import { publishSocialPost } from "@/lib/social/publisher";
import { getEffectiveSocialMode } from "@/lib/social/mode";
import { loadCaptionSettings } from "@/lib/social/captions";
import { serializeSocialPost } from "@/lib/social/serializePost";

export const dynamic = "force-dynamic";

export async function POST(request, context) {
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

    const { searchParams } = new URL(request.url);
    const platform = String(searchParams.get("platform") || "").toLowerCase();
    const mode = await getEffectiveSocialMode();
    post.__captionSettings = await loadCaptionSettings();

    const platforms = {};
    if (platform === "ig" || platform === "instagram") {
      platforms.facebook = false;
      platforms.instagram = true;
    } else if (platform === "fb" || platform === "facebook") {
      platforms.facebook = true;
      platforms.instagram = false;
    }

    const result = await publishSocialPost(post, {
      dryRun: mode.dryRun,
      force: true,
      platforms: Object.keys(platforms).length ? platforms : undefined,
    });

    if (mode.dryRun && result.success) {
      post.status = "published";
      post.pushLog("info", "Post now (test mode) — marked posted (test)");
      await post.save();
    }

    return NextResponse.json({
      success: result.success,
      dryRun: mode.dryRun,
      result,
      post: serializeSocialPost(post),
      error: result.error || "",
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed" }, { status: 500 });
  }
}
