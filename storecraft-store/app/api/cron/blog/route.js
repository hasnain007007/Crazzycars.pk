/**
 * GET /api/cron/blog — publish due scheduled posts + apply auto view increases.
 * Auth: Authorization: Bearer $CRON_SECRET  (query-string secrets rejected — they leak in logs/Referer).
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import BlogPost from "@/lib/models/BlogPost.model";
import {
  applyAutoViewsToAll,
  publishDueScheduledPosts,
} from "@/lib/blogEngagement";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request) {
  const secret = String(process.env.CRON_SECRET || "").trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") || "";
  return header === `Bearer ${secret}`;
}

export async function GET(request) {
  try {
    if (!authorized(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const published = await publishDueScheduledPosts(BlogPost);
    const views = await applyAutoViewsToAll(BlogPost);
    return NextResponse.json({
      success: true,
      scheduledPublished: published,
      autoViews: views,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Cron failed." },
      { status: 500 }
    );
  }
}
