/**
 * GET|POST /api/social/cron?key=CRON_SECRET — every-minute scheduler tick
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { runSocialCronTick } from "@/lib/social/scheduler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key") || request.headers.get("x-cron-secret") || "";
  const secret = String(process.env.CRON_SECRET || "").trim();
  if (!secret) return false;
  return key === secret;
}

async function handle(request) {
  if (!authorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  await dbConnect();
  const { searchParams } = new URL(request.url);
  const limit = Math.min(10, Math.max(1, parseInt(searchParams.get("limit") || "3", 10) || 3));
  const result = await runSocialCronTick(limit);
  return NextResponse.json({ success: true, ...result });
}

export async function GET(request) {
  return handle(request);
}

export async function POST(request) {
  return handle(request);
}
