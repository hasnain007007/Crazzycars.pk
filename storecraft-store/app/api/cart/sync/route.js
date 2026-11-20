/**
 * POST /api/cart/sync — upsert browser cart into CartSession.
 * Body: { sessionId, items, customer?, shippingAddress?, path?, checkoutStage?, customerId? }
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import CartSession from "@/lib/models/CartSession.model";
import Customer from "@/lib/models/Customer.model";
import {
  cartTotals,
  ensureRecoveryToken,
  hasContact,
  normalizeCartItems,
} from "@/lib/abandonedCart";
import { normalizeCheckoutStage } from "@/lib/cartSyncNormalize";
import { phoneForStorage } from "@/lib/pkPhone";
import mongoose from "mongoose";

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
    const checkoutStage = normalizeCheckoutStage(body.checkoutStage);
    const customerId = String(body.customerId || "").trim().slice(0, 64);

    const incomingCustomer = body.customer && typeof body.customer === "object" ? body.customer : {};
    const incomingShip =
      body.shippingAddress && typeof body.shippingAddress === "object" ? body.shippingAddress : {};

    let name = pickStr(incomingCustomer, ["name"], 120) || pickStr(incomingShip, ["name"], 120);
    let email =
      pickStr(incomingCustomer, ["email"], 160).toLowerCase() ||
      pickStr(incomingShip, ["email"], 160).toLowerCase();
    let phoneIncoming =
      pickStr(incomingCustomer, ["phone"], 40) || pickStr(incomingShip, ["phone"], 40);

    let street = pickStr(incomingShip, ["street", "address", "line1"], 200);
    let street2 = pickStr(incomingShip, ["street2", "line2"], 200);
    let area = pickStr(incomingShip, ["area"], 120);
    let city = pickStr(incomingShip, ["city"], 80);
    let state = pickStr(incomingShip, ["state", "province"], 80);
    let zip = pickStr(incomingShip, ["zip", "postcode"], 20);
    let country = pickStr(incomingShip, ["country"], 60) || "Pakistan";

    await dbConnect();

    // Logged-in browser: fill gaps from Customer account (real data only).
    if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
      const needsProfile =
        !name ||
        !email ||
        !phoneIncoming ||
        !street ||
        !city;
      if (needsProfile) {
        try {
          const account = await Customer.findById(customerId)
            .select("name firstName lastName email phone address addresses")
            .lean();
          if (account) {
            const fn = String(account.firstName || "").trim();
            const ln = String(account.lastName || "").trim();
            const accountName =
              String(account.name || "").trim() || `${fn} ${ln}`.trim();
            if (!name && accountName) name = accountName.slice(0, 120);
            if (!email && account.email) email = String(account.email).trim().toLowerCase().slice(0, 160);
            if (!phoneIncoming && account.phone) {
              phoneIncoming = String(account.phone).trim().slice(0, 40);
            }
            const book = Array.isArray(account.addresses) ? account.addresses : [];
            const def = book.find((a) => a?.isDefault) || book[0] || account.address || null;
            if (def && typeof def === "object") {
              if (!phoneIncoming && def.phone) {
                phoneIncoming = String(def.phone).trim().slice(0, 40);
              }
              if (!street) street = String(def.street || def.address || "").trim().slice(0, 200);
              if (!street2) street2 = String(def.street2 || "").trim().slice(0, 200);
              if (!area) area = String(def.area || "").trim().slice(0, 120);
              if (!city) city = String(def.city || "").trim().slice(0, 80);
              if (!state) state = String(def.state || def.province || "").trim().slice(0, 80);
              if (!zip) zip = String(def.zip || def.postcode || "").trim().slice(0, 20);
              if (!pickStr(incomingShip, ["country"], 60) && def.country) {
                country = String(def.country).trim().slice(0, 60) || country;
              }
            }
          }
        } catch {
          /* ignore account lookup failures — sync must still save cart items */
        }
      }
    }

    const phoneStored = phoneIncoming ? phoneForStorage(phoneIncoming) : null;

    let doc = await CartSession.findOne({ sessionId });
    if (!doc) {
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
    if (checkoutStage) doc.checkoutStage = checkoutStage;
    if (customerId) doc.customerId = customerId;

    doc.customer = doc.customer || {};
    // Never blank-out existing contact with empty incoming.
    if (name) doc.customer.name = name;
    if (email && email.includes("@") && !email.startsWith("guest+")) {
      doc.customer.email = email;
    }
    if (phoneStored?.phone) {
      doc.customer.phone = phoneStored.phone;
      doc.customer.phoneValid = Boolean(phoneStored.phoneValid);
      doc.customer.phoneRaw = phoneStored.phoneRaw || "";
    }

    doc.shippingAddress = doc.shippingAddress || {};
    if (name) doc.shippingAddress.name = name;
    if (email && email.includes("@") && !email.startsWith("guest+")) {
      doc.shippingAddress.email = email;
    }
    if (phoneStored?.phone) doc.shippingAddress.phone = phoneStored.phone;
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
      if (doc.status === "abandoned") {
        doc.status = "active";
        doc.abandonedAt = null;
      }
    } else if (doc.status === "abandoned" && hasContact(doc.customer)) {
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
      checkoutStage: doc.checkoutStage || "",
      phoneValid: Boolean(doc.customer?.phoneValid),
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Cart sync failed." },
      { status: 500 }
    );
  }
}
