import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyTemplateVars,
  isSendableCustomerEmail,
  planOrderLifecycleEmails,
} from "../storecraft-admin/lib/orderEmailPlan.js";

describe("order email plan", () => {
  it("replaces nested placeholders without treating dots as regex", () => {
    const out = applyTemplateVars("Hi {customer.first_name} — {order_id}", {
      "customer.first_name": "Ali",
      order_id: "CC-100",
    });
    assert.equal(out, "Hi Ali — CC-100");
  });

  it("sends tracking email when a CN is added", () => {
    const jobs = planOrderLifecycleEmails({
      prevStatus: "processing",
      nextStatus: "shipped",
      prevPayment: "unpaid",
      nextPayment: "unpaid",
      prevTracking: "",
      nextTracking: "PX123",
      paymentMethod: "cod",
    });
    assert.deepEqual(jobs, ["orderShipped"]);
  });

  it("sends payment email when prepaid is marked paid", () => {
    const jobs = planOrderLifecycleEmails({
      prevStatus: "confirmed",
      nextStatus: "confirmed",
      prevPayment: "unpaid",
      nextPayment: "paid",
      prevTracking: "",
      nextTracking: "",
      paymentMethod: "jazzcash",
    });
    assert.deepEqual(jobs, ["orderPaymentReceived"]);
  });

  it("does not send a separate payment email on COD delivered+paid", () => {
    const jobs = planOrderLifecycleEmails({
      prevStatus: "shipped",
      nextStatus: "delivered",
      prevPayment: "unpaid",
      nextPayment: "paid",
      prevTracking: "PX123",
      nextTracking: "PX123",
      paymentMethod: "cod",
    });
    assert.deepEqual(jobs, ["orderDelivered"]);
  });

  it("skips guest checkout addresses", () => {
    assert.equal(isSendableCustomerEmail("guest+03001234567@guest.checkout"), false);
    assert.equal(isSendableCustomerEmail("ali@example.com"), true);
  });
});
