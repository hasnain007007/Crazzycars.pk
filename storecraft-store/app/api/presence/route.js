import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import DailyVisitor from "@/lib/models/DailyVisitor.model";
import LivePresence from "@/lib/models/LivePresence.model";
import { karachiDayKey } from "@/lib/karachiDay";
import { geoFromRequest } from "@/lib/presenceGeo";

const SESSION_RE = /^[a-zA-Z0-9_-]{8,80}$/;

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const sessionId = String(body.sessionId || "").trim();
    if (!SESSION_RE.test(sessionId)) {
      return NextResponse.json({ success: false, error: "Invalid session." }, { status: 400 });
    }

    let path = String(body.path || "/").trim().slice(0, 300) || "/";
    if (!path.startsWith("/")) path = `/${path}`;

    const ua = String(request.headers.get("user-agent") || "").slice(0, 300);
    const now = new Date();
    const geo = geoFromRequest(request);
    const dayKey = karachiDayKey(now);

    const $set = {
      sessionId,
      path,
      lastSeen: now,
      userAgent: ua,
    };
    // Only write geo when known so heartbeats without geo don't wipe prior values
    if (geo.city) $set.city = geo.city.slice(0, 80);
    if (geo.region) $set.region = geo.region.slice(0, 80);
    if (geo.countryCode) $set.countryCode = geo.countryCode;
    if (geo.country) $set.country = geo.country.slice(0, 80);

    await dbConnect();
    await Promise.all([
      LivePresence.findOneAndUpdate({ sessionId }, { $set }, { upsert: true, returnDocument: "after" }),
      DailyVisitor.findOneAndUpdate(
        { dayKey, sessionId },
        {
          $set: { lastSeen: now, path },
          $setOnInsert: { dayKey, sessionId, firstSeen: now },
          $inc: { hits: 1 },
        },
        { upsert: true }
      ),
    ]);

    return NextResponse.json({ success: true, ok: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Presence failed." }, { status: 500 });
  }
}
