/**
 * POST /api/cart/sync — upsert browser cart into CartSession.
 * Body: { sessionId, items, customer?, shippingAddress?, path? }
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

function pickStr(obj, keys, max) {
  for (const key of keys) {
    const v = String(obj?.[key] || "").trim();
    if (v) return v.slice(0, max);
  }
  return "";
}

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
    const incomingShip =
      body.shippingAddress && typeof body.shippingAddress === "object" ? body.shippingAddress : {};

    const name = pickStr(incomingCustomer, ["name"], 120) || pickStr(incomingShip, ["name"], 120);
    const email =
      pickStr(incomingCustomer, ["email"], 160).toLowerCase() ||
      pickStr(incomingShip, ["email"], 160).toLowerCase();
    const phone = pickStr(incomingCustomer, ["phone"], 40) || pickStr(incomingShip, ["phone"], 40);

    const street = pickStr(incomingShip, ["street", "address", "line1"], 200);
    const street2 = pickStr(incomingShip, ["street2", "line2"], 200);
    const area = pickStr(incomingShip, ["area"], 120);
    const city = pickStr(incomingShip, ["city"], 80);
    const state = pickStr(incomingShip, ["state", "province"], 80);
    const zip = pickStr(incomingShip, ["zip", "postcode"], 20);
    const country = pickStr(incomingShip, ["country"], 60) || "Pakistan";

    await dbConnect();
    let doc = await CartSession.findOne({ sessionId });
    if (!doc) {
      // Do not create empty sessions — every page load used to insert an "active"
      // row with 0 items and inflate the Active Carts metric.
      if (items.length === 0) {
        return NextResponse.json({
          success: true,
          status: "active",
          itemCount: 0,
          subtotal: 0,
        });
      }
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

    doc.customer = doc.customer || {};
    if (name) doc.customer.name = name;
    if (email && email.includes("@") && !email.startsWith("guest+")) {
      doc.customer.email = email;
    }
    if (phone) doc.customer.phone = phone;

    doc.shippingAddress = doc.shippingAddress || {};
    if (name) doc.shippingAddress.name = name;
    if (email && email.includes("@") && !email.startsWith("guest+")) {
      doc.shippingAddress.email = email;
    }
    if (phone) doc.shippingAddress.phone = phone;
    if (street) doc.shippingAddress.street = street;
    if (street2) doc.shippingAddress.street2 = street2;
    if (area) doc.shippingAddress.area = area;
    if (city) doc.shippingAddress.city = city;
    if (state) doc.shippingAddress.state = state;
    if (zip) doc.shippingAddress.zip = zip;
    if (country) doc.shippingAddress.country = country;
    doc.markModified("customer");
    doc.markModified("shippingAddress");

    if (items.length === 0) {
      // Empty cart — keep record but stay active (will age out via TTL / cron).
      if (doc.status === "abandoned") {
        doc.status = "active";
        doc.abandonedAt = null;
      }
    } else if (doc.status === "abandoned" && hasContact(doc.customer)) {
      // Customer came back and is shopping again — re-activate and start a fresh
      // reminder cycle (otherwise emailReminderCount stays at the old cap).
      doc.status = "active";
      doc.abandonedAt = null;
      doc.emailReminderCount = 0;
      doc.lastEmailReminderAt = null;
      doc.reminders = [];
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
