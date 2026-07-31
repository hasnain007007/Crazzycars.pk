import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import AiAgentVisit from "@/lib/models/AiAgentVisit.model";
import { AI_SOURCES, classifyAiTraffic } from "@/lib/aiAgentTraffic";

export const dynamic = "force-dynamic";

const ALLOWED_SOURCES = new Set(AI_SOURCES);

/** Prefer dedicated secret; fall back to other server secrets so ingest is never open. */
export function resolveAiVisitIngestSecret() {
  return String(
    process.env.AI_VISIT_INGEST_SECRET ||
      process.env.REVALIDATE_SECRET ||
      process.env.CRON_SECRET ||
      ""
  ).trim();
}

/**
 * Middleware calls this via http://127.0.0.1 (same container) with x-internal-ai-ingest.
 * External/proxy traffic always has x-forwarded-for — rejected without a valid secret.
 */
function isTrustedInternalIngest(request) {
  if (String(request.headers.get("x-internal-ai-ingest") || "") !== "1") return false;
  if (request.headers.get("x-forwarded-for")) return false;
  if (request.headers.get("x-real-ip")) return false;
  const host = String(request.headers.get("host") || "").toLowerCase();
  return host.startsWith("127.0.0.1") || host.startsWith("localhost");
}

/**
 * Internal ingest for AI-agent / AI-referrer visits.
 * Called fire-and-forget from middleware — never blocks page response.
 */
export async function POST(request) {
  try {
    const secret = resolveAiVisitIngestSecret();
    const got = String(request.headers.get("x-ai-visit-secret") || "").trim();
    const secretOk = Boolean(secret && got && got === secret);
    const internalOk = isTrustedInternalIngest(request);

    if (!secretOk && !internalOk) {
      if (!secret) {
        return NextResponse.json({ success: false, error: "Ingest not configured" }, { status: 503 });
      }
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
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
