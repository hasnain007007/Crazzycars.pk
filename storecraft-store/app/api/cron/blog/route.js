/**
 * GET /api/cron/blog — publish due scheduled posts.
 * Auth: Authorization: Bearer $CRON_SECRET (falls back to REVALIDATE_SECRET).
 * Query-string secrets are rejected — they leak in logs/Referer.
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import BlogPost from "@/lib/models/BlogPost.model";
import { publishDueScheduledPosts } from "@/lib/blogEngagement";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function resolveCronSecret() {
  return String(process.env.CRON_SECRET || process.env.REVALIDATE_SECRET || "").trim();
}

function authorized(request) {
  const secret = resolveCronSecret();
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
    return NextResponse.json({
      success: true,
      scheduledPublished: published,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Cron failed." },
      { status: 500 }
    );
  }
}
