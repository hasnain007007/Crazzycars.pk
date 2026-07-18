import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import LivePresence from "@/lib/models/LivePresence.model";

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

    await dbConnect();
    await LivePresence.findOneAndUpdate(
      { sessionId },
      {
        $set: {
          sessionId,
          path,
          lastSeen: now,
          userAgent: ua,
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, ok: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Presence failed." }, { status: 500 });
  }
}
