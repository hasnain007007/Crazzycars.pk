/**
 * POST /api/social/posts/[id]/publish — publish now (respects SOCIAL_DRY_RUN unless body.dryRun set).
 * body: { dryRun?: boolean, force?: boolean }
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessAnyCapability } from "@/lib/denyCapability";
import SocialPost from "@/lib/models/SocialPost.model";
import { getSocialConfig } from "@/lib/social/config";
import { publishSocialPost } from "@/lib/social/publisher";
import { getMetaHaltState } from "@/lib/social/metaHalt";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(request, context) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessAnyCapability(user, ["canManageContent", "canManageSettings"]);
    if (denied) return denied;

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const cfg = getSocialConfig();
    let dryRun = cfg.dryRun;
    if (body.dryRun === true) dryRun = true;
    if (body.dryRun === false) {
      if (cfg.dryRun) {
        return NextResponse.json(
          {
            success: false,
            error:
              "SOCIAL_DRY_RUN=true on the server. Set SOCIAL_DRY_RUN=false in Coolify (and restart) for a real publish.",
            dryRun: true,
          },
          { status: 400 }
        );
      }
      dryRun = false;
    }

    await dbConnect();
    const halt = await getMetaHaltState();
    if (halt.halted && !dryRun) {
      return NextResponse.json(
        {
          success: false,
          halted: true,
          error: `Facebook token invalid – replace META_PAGE_TOKEN. ${halt.reason}`,
        },
        { status: 503 }
      );
    }

    const post = await SocialPost.findById(id);
    if (!post) {
      return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 });
    }

    const result = await publishSocialPost(post, {
      dryRun,
      force: Boolean(body.force),
    });

    return NextResponse.json({
      success: result.success,
      dryRun: result.dryRun,
      halted: result.halted,
      status: result.status,
      facebook: {
        success: result.facebook?.success,
        skipped: result.facebook?.skipped,
        postId: result.facebook?.postId,
        url: result.facebook?.url,
        error: result.facebook?.error,
      },
      instagram: {
        success: result.instagram?.success,
        skipped: result.instagram?.skipped,
        mediaId: result.instagram?.mediaId,
        permalink: result.instagram?.permalink,
        error: result.instagram?.error,
      },
      planned: result.planned || [],
      warnings: result.warnings || [],
      error: result.error || "",
      post: {
        id: String(post._id),
        status: post.status,
        results: post.results,
        logs: (post.logs || []).slice(-10),
      },
    });
  } catch (e) {
    console.error("[social:publish]", e);
    return NextResponse.json(
      { success: false, error: e.message || "Publish failed" },
      { status: 500 }
    );
  }
}
