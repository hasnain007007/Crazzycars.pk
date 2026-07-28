import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import AiAgentVisit from "@/lib/models/AiAgentVisit.model";
import { AI_SOURCES, classifyAiTraffic } from "@/lib/aiAgentTraffic";

export const dynamic = "force-dynamic";

const ALLOWED_SOURCES = new Set(AI_SOURCES);

/**
 * Internal ingest for AI-agent / AI-referrer visits.
 * Called fire-and-forget from middleware — never blocks page response.
 */
export async function POST(request) {
  try {
    const secret = String(process.env.AI_VISIT_INGEST_SECRET || "").trim();
    if (secret) {
      const got = String(request.headers.get("x-ai-visit-secret") || "").trim();
      if (got !== secret) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await request.json().catch(() => ({}));
    const path = String(body.path || "/").trim().slice(0, 500) || "/";
    const userAgent = String(body.userAgent || request.headers.get("user-agent") || "").slice(0, 400);
    const referrer = String(body.referrer || request.headers.get("referer") || "").slice(0, 1000);

    let source = String(body.source || "").trim();
    let detection = String(body.detection || "").trim();
    let referrerQuery = String(body.referrerQuery || "").trim().slice(0, 500);

    if (!ALLOWED_SOURCES.has(source) || !["user_agent", "referrer"].includes(detection)) {
      const hit = classifyAiTraffic({ userAgent, referrer });
      if (!hit?.matched) {
        return NextResponse.json({ success: false, error: "Not AI traffic." }, { status: 400 });
      }
      source = hit.source;
      detection = hit.detection;
      referrerQuery = hit.referrerQuery || referrerQuery;
    }

    await dbConnect();
    await AiAgentVisit.create({
      path,
      source,
      detection,
      userAgent,
      referrer,
      referrerQuery,
      method: String(body.method || "GET").slice(0, 10),
    });

    return NextResponse.json({
      success: true,
      note: "Logged AI visit/referrer signal only — not sales attribution.",
    });
  } catch (e) {
    console.error("ai-visit ingest:", e);
    return NextResponse.json({ success: false, error: "Log failed" }, { status: 500 });
  }
}
