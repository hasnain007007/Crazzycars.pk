/**
 * Order Hub Local bridge (Order Hub ↔ this admin).
 *
 * Read requests use ORDERHUB_PULL_TOKEN, changes use ORDERHUB_WRITE_TOKEN (each at least 24 characters).
 * Changes are not re-implemented here: after the hub's key is checked, the admin's existing routes
 * (order update, PostEx / Run Courier booking, label, track, cancel) are called as a short-lived
 * "Order Hub" staff session, so status history, customer emails, airway bills and the activity log
 * are exactly the same as when staff use this admin.
 */
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { signToken } from "@/lib/auth";
import { JWT_COOKIE_NAME } from "@/lib/constants";

/** Fixed id used in activity logs for actions taken from Order Hub ("orderhub" in hex). */
export const ORDERHUB_USER_ID = "6f7264657268756200000001";

function tokenMatches(req, envName) {
  const expected = process.env[envName] || "";
  const got = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (expected.length < 24 || got.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

/** Returns a 401 response unless the request carries the given key. */
export function requireKey(req, kind) {
  const ok = tokenMatches(req, kind === "write" ? "ORDERHUB_WRITE_TOKEN" : "ORDERHUB_PULL_TOKEN");
  return ok ? null : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const clean = (v, max = 200) => (v == null ? "" : String(v).trim().slice(0, max));

/**
 * Staff session for "<name> (Order Hub)". Signed with this admin's own signToken, so it carries the
 * right session marker for this codebase. It only ever lives inside this process (never sent out).
 * Role "editor" = staff: can manage orders, cannot refund, change settings or users.
 */
function serviceCookie(by) {
  const token = signToken({ userId: ORDERHUB_USER_ID, role: "editor", name: `${clean(by, 60) || "staff"} (Order Hub)`, email: "" });
  return `${JWT_COOKIE_NAME}=${token}`;
}

/**
 * Call an existing admin route handler as the Order Hub service user.
 * `handler` is the imported GET/POST/PUT function; `params` is passed for dynamic routes.
 */
export async function callAdminRoute(req, handler, { path, method = "GET", query, body, by, params } = {}) {
  const url = new URL(path, req.url);
  for (const [k, v] of Object.entries(query || {})) if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  const inner = new NextRequest(url, {
    method,
    headers: { cookie: serviceCookie(by), ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return handler(inner, params ? { params: Promise.resolve(params) } : undefined);
}

export async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

/**
 * Orders worth sending to the hub. Unpaid card / PayPal checkouts that never completed are
 * abandoned payment attempts and are left out; COD and bank-transfer orders are real orders.
 */
export const EXPORTABLE_ORDER_FILTER = {
  $nor: [
    {
      paymentMethod: { $in: ["stripe", "paypal"] },
      paymentStatus: { $in: ["unpaid", "failed"] },
      orderStatus: "pending",
    },
  ],
};

/** Fields left out of the feed (large, internal or secret). The first timeline entry is kept to tell staff-made orders apart. */
export const FEED_PROJECTION = {
  emailHistory: 0,
  statusHistory: 0,
  internalNotes: 0,
  postexLabel: 0,
  runCourierLabel: 0,
  publicAccessToken: 0,
  idempotencyKey: 0,
  "payment.paypalOrderId": 0,
  "payment.paypalCaptureId": 0,
  "payment.stripePaymentIntentId": 0,
  courierSettlement: 0,
  timeline: { $slice: 1 },
};

const PAYMENT_LABELS = {
  cod: "cod",
  stripe: "Card (Stripe)",
  paypal: "PayPal",
  nayapay: "NayaPay",
  sadapay: "SadaPay",
  alliedBank: "Allied Bank transfer",
  jazzcash: "JazzCash",
  easypaisa: "Easypaisa",
  bankTransfer: "Bank transfer",
  hbl: "HBL transfer",
  meezan: "Meezan transfer",
  ubl: "UBL transfer",
};

const join = (...p) => p.map((x) => clean(x)).filter(Boolean).join(" ");

/** Storefront base URL for relative product images. */
function assetUrl(src) {
  const s = clean(src, 1000);
  if (!s || /^https?:\/\//i.test(s)) return s;
  const base = (process.env.NEXT_PUBLIC_STORE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.STORE_URL || "").replace(/\/+$/, "");
  return base ? `${base}${s.startsWith("/") ? "" : "/"}${s}` : "";
}

const touch = (t) =>
  t
    ? {
        channel: clean(t.channel, 40),
        label: clean(t.label, 80),
        source: clean(t.source, 80),
        medium: clean(t.medium, 80),
        campaign: clean(t.campaign, 120),
        content: clean(t.content, 80),
        term: clean(t.term, 80),
        referrer: clean(t.referrerHost, 120),
        landing_page: clean(t.landingPath, 200),
        at: t.detectedAt ? new Date(t.detectedAt).toISOString() : "",
        click_id: t.hasGclid ? "gclid" : t.hasFbclid ? "fbclid" : "",
      }
    : null;

/**
 * Where the order came from. Staff-made orders (invoice, created in this admin) are marked as such;
 * website orders carry the attribution stamped at checkout (UTM, ad click, referrer, landing page).
 */
export function orderOrigin(o) {
  const by = o.timeline?.[0]?.by;
  const orderSource = clean(o.orderSource, 40).toLowerCase() || (o.invoiceId ? "invoice" : by === "admin" ? "manual" : "");
  const a = o.attribution || null;
  if (!a && !orderSource && !o.aiAttributedSource) return null;
  const ai = clean(o.aiAttributedSource, 40);
  return {
    order_source: orderSource,
    channel: clean(a?.channel, 40) || (ai ? `ai_${ai}` : ""),
    label: clean(a?.label, 80),
    source: clean(a?.source, 80) || ai,
    medium: clean(a?.medium, 80) || (ai ? "ai" : ""),
    campaign: clean(a?.campaign, 120),
    referrer: clean(a?.referrerHost, 120),
    landing_page: clean(a?.landingPath, 200),
    first_touch: touch(a?.firstTouch),
    last_touch: touch(a?.lastTouch),
  };
}

/** Mongoose order (lean) → Order Hub order format (orderhub local/docs/CUSTOM-STORE-API.md). */
export function toOrderHubOrder(o) {
  const p = o.pricing || {};
  const c = o.customer || {};
  const a = o.shippingAddress || {};
  const trackingNumber = clean(o.trackingNumber || o.tracking?.number, 120);
  const pay = o.payment || {};
  return {
    id: String(o._id),
    number: o.orderNumber,
    created_at: o.createdAt,
    updated_at: o.updatedAt,
    status: o.orderStatus,
    payment_status: o.paymentStatus === "partial" ? "partially_paid" : o.paymentStatus,
    payment_method: PAYMENT_LABELS[o.paymentMethod] || clean(o.paymentMethod),
    currency: o.currency || "PKR",
    subtotal: p.subtotal ?? o.subtotal ?? 0,
    discount: p.discount ?? 0,
    shipping: p.shippingCost ?? o.shippingCost ?? 0,
    tax: 0,
    total: p.total ?? 0,
    customer: {
      name: clean(c.name) || join(c.firstName, c.lastName),
      email: clean(c.email),
      phone: clean(c.phone),
    },
    shipping_address: {
      name: clean(a.name) || join(a.firstName, a.lastName) || clean(c.name),
      phone: clean(a.phone) || clean(c.phone),
      line1: clean(a.line1 || a.street || a.address, 300),
      line2: clean(a.line2 || a.street2 || a.area, 300),
      city: clean(a.city),
      state: clean(a.state || a.province),
      zip: clean(a.postcode || a.postalCode || a.zip),
      country: clean(a.country) || "Pakistan",
    },
    items: (o.items || []).map((it, i) => ({
      id: String(it.productId || i),
      sku: clean(it.articleNo),
      name: it.name,
      variant: [clean(it.variation), (it.selectedAddOns || []).map((x) => clean(x?.name)).filter(Boolean).join(", ")]
        .filter(Boolean)
        .join(" · "),
      quantity: it.quantity,
      unit_price: it.unitPrice,
      total: it.total,
      image: assetUrl(it.image),
    })),
    tracking: trackingNumber
      ? { number: trackingNumber, carrier: clean(o.courier || o.tracking?.carrier), url: clean(o.trackingUrl || o.tracking?.url, 500) }
      : null,
    note: "",
    tags: [
      o.couponCode ? `coupon:${o.couponCode}` : "",
      o.codConfirmed ? "cod-confirmed" : "",
      pay.advanceRequired > 0 && !(pay.paidAmount >= pay.advanceRequired) ? "advance-due" : "",
      ...(Array.isArray(o.tags) ? o.tags.map((t) => clean(t, 40)) : []),
    ].filter(Boolean),
    origin: orderOrigin(o),
  };
}
