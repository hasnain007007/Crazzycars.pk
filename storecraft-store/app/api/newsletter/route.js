import { NextResponse } from "next/server";
import {
  actionRateLimitKey,
  checkActionRateLimit,
  rateLimitResponse,
  recordActionAttempt,
} from "@/lib/actionRateLimit";
import { dbConnect } from "@/lib/db";
import NewsletterSubscriber from "@/lib/models/NewsletterSubscriber.model";
import { requestIp } from "@/lib/requestIp";

const NEWSLETTER_RATE = { maxAttempts: 5, windowMs: 60 * 60 * 1000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ success: false, error: "Enter a valid email." }, { status: 400 });
    }

    const ip = requestIp(req);
    const key = actionRateLimitKey("newsletter", email, ip);
    const limited = await checkActionRateLimit(key, NEWSLETTER_RATE);
    if (limited.limited) {
      return rateLimitResponse(limited.remainingMs, "Too many subscribe attempts. Try again later.");
    }

    await dbConnect();
    await NewsletterSubscriber.updateOne(
      { email },
      { $setOnInsert: { email, source: "homepage" } },
      { upsert: true }
    );
    await recordActionAttempt(key, NEWSLETTER_RATE);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[newsletter]", err?.message || err);
    return NextResponse.json({ success: false, error: "Could not subscribe right now." }, { status: 500 });
  }
}
