import { test } from "node:test";
import assert from "node:assert/strict";
import {
  collectedAmount,
  findOrderGaps,
  ordersByDay,
  outstandingAmount,
  profitSummary,
  summarizeOrders,
  topCities,
  trackedConversion,
} from "../storecraft-admin/lib/dashboardMetrics.js";

const order = (over = {}) => ({
  createdAt: new Date("2026-10-20T10:00:00+05:00"),
  orderStatus: "pending",
  paymentStatus: "unpaid",
  pricing: { total: 5000, discount: 0 },
  items: [],
  ...over,
});

test("collected counts paid, delivered COD and advances; void orders count nothing", () => {
  assert.equal(collectedAmount(order({ paymentStatus: "paid" })), 5000);
  assert.equal(collectedAmount(order({ orderStatus: "delivered" })), 5000);
  assert.equal(collectedAmount(order({ paymentStatus: "partial", payment: { paidAmount: 600 } })), 600);
  assert.equal(collectedAmount(order({ orderStatus: "cancelled", paymentStatus: "paid" })), 0);
  assert.equal(outstandingAmount(order({ paymentStatus: "partial", payment: { paidAmount: 600 } })), 4400);
  assert.equal(outstandingAmount(order({ orderStatus: "delivered" })), 0);
  assert.equal(outstandingAmount(order({ orderStatus: "returned" })), 0);
});

test("summary books non-void orders only and averages over them", () => {
  const s = summarizeOrders([
    order({ pricing: { total: 4000 } }),
    order({ pricing: { total: 6000 }, paymentStatus: "paid", orderStatus: "confirmed" }),
    order({ pricing: { total: 9000 }, orderStatus: "cancelled" }),
  ]);
  assert.equal(s.orders, 3);
  assert.equal(s.booked, 10000);
  assert.equal(s.avgOrderValue, 5000);
  assert.equal(s.collected, 6000);
  assert.equal(s.outstanding, 4000);
  assert.equal(s.cancelled, 1);
  assert.equal(s.pendingConfirm, 1);
});

test("conversion ignores days without real visitor tracking", () => {
  const dayOrders = ordersByDay([
    order({ createdAt: new Date("2026-10-01T12:00:00+05:00") }),
    order({ createdAt: new Date("2026-10-01T13:00:00+05:00") }),
    order({ createdAt: new Date("2026-10-28T12:00:00+05:00") }),
  ]);
  // 10-01 had no tracking at all, 10-27 only a partial day.
  const visitors = new Map([
    ["2026-10-27", 10],
    ["2026-10-28", 200],
  ]);
  const c = trackedConversion(visitors, dayOrders);
  assert.deepEqual(c, { rate: 0.5, visitors: 200, orders: 1, days: 1 });
});

test("order gaps flag a long zero-order run in a busy store, not a quiet one", () => {
  const keys = [];
  for (let d = 1; d <= 20; d += 1) keys.push(`2026-10-${String(d).padStart(2, "0")}`);
  const busy = new Map(keys.map((k) => [k, { orders: 5, booked: 1 }]));
  for (const k of ["2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11", "2026-10-12"]) busy.delete(k);
  assert.deepEqual(findOrderGaps(keys, busy), [{ from: "2026-10-08", to: "2026-10-12", days: 5 }]);

  const quiet = new Map([["2026-10-01", { orders: 1, booked: 1 }]]);
  assert.deepEqual(findOrderGaps(keys, quiet), []);
});

test("profit uses only costed lines on realised orders and reports coverage", () => {
  const costs = new Map([["a", 600]]);
  const p = profitSummary(
    [
      order({
        paymentStatus: "paid",
        pricing: { total: 2000, discount: 0 },
        items: [
          { productId: "a", name: "A", quantity: 1, unitPrice: 1000 },
          { productId: "b", name: "B", quantity: 1, unitPrice: 1000 },
        ],
      }),
      // Not realised yet: ignored.
      order({ items: [{ productId: "a", quantity: 5, unitPrice: 1000 }] }),
    ],
    costs
  );
  assert.equal(p.profit, 400);
  assert.equal(p.margin, 40);
  assert.equal(p.coverage, 50);
  assert.equal(p.realisedOrders, 1);
  assert.equal(p.missingCost[0].name, "B");
});

test("top cities merge spelling variants", () => {
  const rows = topCities([
    order({ shippingAddress: { city: "lahore" } }),
    order({ shippingAddress: { city: " Lahore " } }),
    order({ shippingAddress: { city: "Karachi" } }),
  ]);
  assert.equal(rows[0].city, "Lahore");
  assert.equal(rows[0].orders, 2);
  assert.equal(rows[0].percent, 66.7);
});
