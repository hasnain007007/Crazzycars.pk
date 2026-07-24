/**
 * Local dry-run of applyPostexStatusToOrder / COD paid rules (no HTTP, no DB).
 * Run: node scripts/test-postex-webhook-logic.mjs
 */
import assert from "node:assert/strict";

function normalizePostexStatus(raw) {
  return String(raw || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

const POSTEX_DELIVERED_STATUSES = new Set(["delivered"]);
const SHIPPED_LIKE = new Set([
  "booked",
  "picked by postex",
  "postex warehouse",
  "out for delivery",
  "en-route to postex warehouse",
  "attempted",
  "delivery under review",
]);
const RETURNED_LIKE = new Set(["returned", "out for return"]);
const IGNORE_LIKE = new Set(["unbooked", "expired", "un-assigned by me"]);

function mapPostexStatusToOrderStatus(postexStatus) {
  const s = normalizePostexStatus(postexStatus);
  if (!s) return null;
  if (POSTEX_DELIVERED_STATUSES.has(s)) return "delivered";
  if (RETURNED_LIKE.has(s)) return "returned";
  if (SHIPPED_LIKE.has(s)) return "shipped";
  if (IGNORE_LIKE.has(s)) return null;
  if (s.startsWith("en-route to")) return "shipped";
  return null;
}

function isCodPaymentMethod(method) {
  const m = String(method || "").toLowerCase();
  return m === "cod" || m.includes("cash");
}

function apply(order, postexStatus) {
  const mapped = mapPostexStatusToOrderStatus(postexStatus);
  const notes = [];
  let codMarkedPaid = false;
  if (mapped && order.orderStatus !== mapped) {
    if (!(order.orderStatus === "delivered" && mapped === "shipped")) {
      order.orderStatus = mapped;
    }
  }
  if (POSTEX_DELIVERED_STATUSES.has(normalizePostexStatus(postexStatus))) {
    if (isCodPaymentMethod(order.paymentMethod) && order.paymentStatus !== "paid") {
      order.paymentStatus = "paid";
      codMarkedPaid = true;
      notes.push("COD paymentStatus → paid");
    }
  }
  return { order, codMarkedPaid, mapped, notes };
}

// Delivered + COD unpaid → paid
{
  const o = { orderStatus: "shipped", paymentMethod: "cod", paymentStatus: "unpaid", orderNumber: "T1" };
  const r = apply(o, "Delivered");
  assert.equal(r.order.orderStatus, "delivered");
  assert.equal(r.order.paymentStatus, "paid");
  assert.equal(r.codMarkedPaid, true);
}

// Delivered + stripe → do not touch payment
{
  const o = { orderStatus: "shipped", paymentMethod: "stripe", paymentStatus: "paid", orderNumber: "T2" };
  const r = apply(o, "Delivered");
  assert.equal(r.order.orderStatus, "delivered");
  assert.equal(r.codMarkedPaid, false);
  assert.equal(r.order.paymentStatus, "paid");
}

// Returned + COD → NEVER paid
{
  const o = { orderStatus: "shipped", paymentMethod: "cod", paymentStatus: "unpaid", orderNumber: "T3" };
  const r = apply(o, "Returned");
  assert.equal(r.order.orderStatus, "returned");
  assert.equal(r.order.paymentStatus, "unpaid");
  assert.equal(r.codMarkedPaid, false);
}

// Out For Delivery + COD → shipped, not paid
{
  const o = { orderStatus: "processing", paymentMethod: "cod", paymentStatus: "unpaid", orderNumber: "T4" };
  const r = apply(o, "Out For Delivery");
  assert.equal(r.order.orderStatus, "shipped");
  assert.equal(r.order.paymentStatus, "unpaid");
  assert.equal(r.codMarkedPaid, false);
}

console.log("OK — Delivered-only COD→Paid rules pass");
