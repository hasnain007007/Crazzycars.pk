/**
 * POST /api/cart/sync — upsert browser cart into CartSession.
 * Body: { sessionId, items, customer?, path? }
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import CartSession from "@/lib/models/CartSession.model";
import {
  cartTotals,
  ensureRecoveryToken,
  hasContact,
  normalizeCartItems,
} from "@/lib/abandonedCart";

export const dynamic = "force-dynamic";

const SESSION_RE = /^[a-zA-Z0-9_-]{8,80}$/;

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const sessionId = String(body.sessionId || "").trim();
    if (!SESSION_RE.test(sessionId)) {
      return NextResponse.json({ success: false, error: "Invalid session." }, { status: 400 });
    }

    const items = normalizeCartItems(body.items);
    const { itemCount, subtotal } = cartTotals(items);
    const now = new Date();
    const path = String(body.path || "").trim().slice(0, 200);
    const ua = String(request.headers.get("user-agent") || "").slice(0, 300);

    const incomingCustomer = body.customer && typeof body.customer === "object" ? body.customer : {};
    const name = String(incomingCustomer.name || "").trim().slice(0, 120);
    const email = String(incomingCustomer.email || "").trim().toLowerCase().slice(0, 160);
    const phone = String(incomingCustomer.phone || "").trim().slice(0, 40);

    await dbConnect();
    let doc = await CartSession.findOne({ sessionId });
    if (!doc) {
      doc = new CartSession({ sessionId });
    }

    ensureRecoveryToken(doc);

    // Don't resurrect recovered/dismissed carts unless they add items again.
    if (doc.status === "recovered" || doc.status === "dismissed") {
      if (items.length === 0) {
        return NextResponse.json({
          success: true,
          status: doc.status,
          recoveryToken: doc.recoveryToken,
        });
      }
      doc.status = "active";
      doc.recoveredAt = null;
      doc.convertedOrderId = null;
      doc.convertedOrderNumber = "";
      doc.abandonedAt = null;
      doc.emailReminderCount = 0;
      doc.lastEmailReminderAt = null;
      doc.reminders = [];
    }

    doc.items = items;
    doc.itemCount = itemCount;
    doc.subtotal = subtotal;
    doc.lastActivityAt = now;
    doc.expiresAt = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
    if (path) doc.lastPath = path;
    if (ua) doc.userAgent = ua;

    if (name) doc.customer.name = name;
    if (email && email.includes("@") && !email.startsWith("guest+")) {
      doc.customer.email = email;
    }
    if (phone) doc.customer.phone = phone;

    if (items.length === 0) {
      // Empty cart — keep record but stay active (will age out via TTL / cron).
      if (doc.status === "abandoned") {
        doc.status = "active";
        doc.abandonedAt = null;
      }
    } else if (doc.status === "abandoned" && hasContact(doc.customer)) {
      // Customer came back and is shopping again — re-activate.
      doc.status = "active";
      doc.abandonedAt = null;
    }

    await doc.save();

    return NextResponse.json({
      success: true,
      status: doc.status,
      recoveryToken: doc.recoveryToken,
      itemCount: doc.itemCount,
      subtotal: doc.subtotal,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Cart sync failed." },
      { status: 500 }
    );
  }
}
