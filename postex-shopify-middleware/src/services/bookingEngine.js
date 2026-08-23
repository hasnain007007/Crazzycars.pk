"use strict";

/**
 * Core booking engine: Shopify order → PostEx create → Shopify fulfillment.
 * Idempotent: never books the same Shopify order twice.
 */
const { prisma } = require("../utils/db");
const postex = require("./postex");
const shopify = require("./shopify");
const cityMapper = require("./cityMapper");
const {
  normalizePhone,
  isValidPkPhone,
  sanitizeAddress,
  buildItemsSummary,
  countItems,
  computeCodAmount,
} = require("./orderHelpers");
const { logger } = require("../utils/logger");
const { getRuntimeSettings } = require("./settings");

const PICKED_BLOCK_STATUSES = [
  "picked by postex",
  "postex warehouse",
  "out for delivery",
  "en-route to postex warehouse",
  "attempted",
  "delivered",
  "returned",
  "out for return",
];

function isAlreadyPicked(status) {
  const s = String(status || "").toLowerCase();
  return PICKED_BLOCK_STATUSES.some((x) => s.includes(x));
}

/**
 * Upsert from Shopify webhook payload into our Order row.
 */
async function upsertFromShopifyWebhook(shopifyOrder) {
  const shopifyOrderId = String(shopifyOrder.id);
  const shopifyOrderNumber = String(shopifyOrder.order_number || shopifyOrder.name || shopifyOrderId);
  const shipping =
    (shopifyOrder.shipping_address && typeof shopifyOrder.shipping_address === "object"
      ? shopifyOrder.shipping_address
      : null) ||
    shopifyOrder.billing_address ||
    {};

  const customerName =
    [shipping.first_name, shipping.last_name].filter(Boolean).join(" ").trim() ||
    shopifyOrder.customer?.first_name ||
    "Customer";

  const phoneRaw = shipping.phone || shopifyOrder.phone || shopifyOrder.customer?.phone || "";
  const phone = normalizePhone(phoneRaw);
  const address = sanitizeAddress(shipping.address1, shipping.address2);
  const city = String(shipping.city || "").trim();
  const codAmount = computeCodAmount(shopifyOrder);
  const itemsSummary = buildItemsSummary(shopifyOrder.line_items);
  const itemCount = countItems(shopifyOrder.line_items);
  const financialStatus = String(shopifyOrder.financial_status || "pending").toLowerCase();

  const existing = await prisma.order.findUnique({ where: { shopifyOrderId } });
  if (existing) {
    // Only update contact fields if not yet booked
    if (existing.bookingStatus === "PENDING_BOOKING" || existing.bookingStatus === "BOOKING_FAILED") {
      return prisma.order.update({
        where: { shopifyOrderId },
        data: {
          customerName,
          phone,
          address,
          city,
          codAmount,
          itemsSummary,
          itemCount,
          financialStatus,
        },
      });
    }
    return existing;
  }

  return prisma.order.create({
    data: {
      shopifyOrderId,
      shopifyOrderNumber,
      customerName,
      phone,
      address,
      city,
      codAmount,
      itemsSummary,
      itemCount,
      financialStatus,
      bookingStatus: "PENDING_BOOKING",
    },
  });
}

/** How many bookOrder() calls are still running (for graceful shutdown). */
let inflightBookings = 0;

function getInflightBookings() {
  return inflightBookings;
}

/**
 * Book one order with PostEx + write tracking to Shopify.
 */
async function bookOrder(orderId, { force = false } = {}) {
  inflightBookings += 1;
  try {
    return await bookOrderInner(orderId, { force });
  } finally {
    inflightBookings = Math.max(0, inflightBookings - 1);
  }
}

async function bookOrderInner(orderId, { force = false } = {}) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, error: "Order not found" };

  // Duplicate prevention
  if (order.postexTrackingNumber && !force) {
    return { ok: true, skipped: true, trackingNumber: order.postexTrackingNumber };
  }
  if (order.bookingStatus === "BOOKED" && order.postexTrackingNumber) {
    return { ok: true, skipped: true, trackingNumber: order.postexTrackingNumber };
  }
  if (order.bookingStatus === "CANCELLED") {
    return { ok: false, error: "Order is cancelled" };
  }

  // Soft lock so duplicate webhooks can't book twice at the same time.
  // Stale locks (>5 min) are reclaimable so a crashed worker cannot block forever.
  const LOCK_TTL_MS = 5 * 60 * 1000;
  const staleBefore = new Date(Date.now() - LOCK_TTL_MS);
  if (order.lastError === "BOOKING_IN_PROGRESS" && !force) {
    const lockAge = Date.now() - new Date(order.updatedAt || 0).getTime();
    if (Number.isFinite(lockAge) && lockAge < LOCK_TTL_MS) {
      return { ok: false, error: "Booking already in progress" };
    }
  }
  const claimed = await prisma.order.updateMany({
    where: force
      ? {
          id: order.id,
          postexTrackingNumber: null,
          bookingStatus: { in: ["PENDING_BOOKING", "BOOKING_FAILED"] },
        }
      : {
          id: order.id,
          postexTrackingNumber: null,
          bookingStatus: { in: ["PENDING_BOOKING", "BOOKING_FAILED"] },
          OR: [
            { NOT: { lastError: "BOOKING_IN_PROGRESS" } },
            { updatedAt: { lt: staleBefore } },
          ],
        },
    data: { lastError: "BOOKING_IN_PROGRESS" },
  });
  if (claimed.count === 0 && !force) {
    const fresh = await prisma.order.findUnique({ where: { id: orderId } });
    if (fresh?.postexTrackingNumber) {
      return { ok: true, skipped: true, trackingNumber: fresh.postexTrackingNumber };
    }
    return { ok: false, error: "Could not claim order for booking (already in progress?)" };
  }

  // Phone
  const phone = normalizePhone(order.phone);
  if (!isValidPkPhone(phone)) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        bookingStatus: "BOOKING_FAILED",
        lastError: "Invalid phone — need 03XXXXXXXXX (11 digits)",
      },
    });
    return { ok: false, error: "Invalid phone" };
  }

  // Address
  if (String(order.address || "").trim().length < 10) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        bookingStatus: "BOOKING_FAILED",
        lastError: "Address too short — please review manually",
      },
    });
    return { ok: false, error: "Address too short" };
  }

  // City
  const cityRes = await cityMapper.resolveCity(order.city);
  if (!cityRes.ok) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        bookingStatus: "BOOKING_FAILED",
        lastError: `CITY_MISMATCH: could not map "${order.city}" to a PostEx city`,
        mappedCity: "",
      },
    });
    return { ok: false, error: "CITY_MISMATCH" };
  }

  const settings = await getRuntimeSettings();
  const pickup = settings.pickupAddressCode || process.env.POSTEX_PICKUP_ADDRESS_CODE || "001";
  const orderType = process.env.POSTEX_ORDER_TYPE || "Normal";

  const payload = {
    orderRefNumber: `SHOPIFY-${order.shopifyOrderNumber}`.replace(/^SHOPIFY-#/, "SHOPIFY-"),
    invoicePayment: Number(order.codAmount) || 0,
    orderDetail: order.itemsSummary || `Order ${order.shopifyOrderNumber}`,
    customerName: order.customerName,
    customerPhone: phone,
    deliveryAddress: order.address,
    transactionNotes: "",
    cityName: cityRes.cityName,
    invoiceDivision: 0,
    items: order.itemCount || 1,
    pickupAddressCode: String(pickup),
    orderType,
  };

  const createRes = await postex.createOrder(payload);

  if (!createRes.ok) {
    const is5xx = createRes.status >= 500 || createRes.status === 0;
    if (is5xx) {
      // Retryable — stay PENDING
      const retryCount = (order.retryCount || 0) + 1;
      await prisma.order.update({
        where: { id: order.id },
        data: {
          bookingStatus: "PENDING_BOOKING",
          retryCount,
          nextRetryAt: nextRetryDate(retryCount),
          lastError: createRes.error || "PostEx temporary error",
          mappedCity: cityRes.cityName,
          phone,
        },
      });
      return { ok: false, retryable: true, error: createRes.error };
    }
    // 4xx validation — fail hard
    await prisma.order.update({
      where: { id: order.id },
      data: {
        bookingStatus: "BOOKING_FAILED",
        lastError: createRes.error || `PostEx ${createRes.status}`,
        mappedCity: cityRes.cityName,
        phone,
      },
    });
    return { ok: false, retryable: false, error: createRes.error };
  }

  const tn = createRes.trackingNumber;
  const history = [
    {
      status: "Booked",
      at: new Date().toISOString(),
      note: "Created via PostEx API",
    },
  ];

  await prisma.order.update({
    where: { id: order.id },
    data: {
      bookingStatus: "BOOKED",
      postexTrackingNumber: tn,
      postexStatus: "Booked",
      postexStatusHistory: JSON.stringify(history),
      mappedCity: cityRes.cityName,
      phone,
      lastError: "",
      retryCount: 0,
      nextRetryAt: null,
    },
  });

  // Write tracking back to Shopify (non-blocking failure — CN still saved)
  try {
    const fulfill = await shopify.fulfillOrderWithTracking(order.shopifyOrderId, tn);
    if (fulfill.ok && fulfill.data?.fulfillmentId) {
      await prisma.order.update({
        where: { id: order.id },
        data: { shopifyFulfillmentId: fulfill.data.fulfillmentId },
      });
    } else if (!fulfill.ok) {
      logger.warn({ orderId: order.id, error: fulfill.error }, "Shopify fulfillment failed");
      await prisma.order.update({
        where: { id: order.id },
        data: {
          lastError: `Booked on PostEx (${tn}) but Shopify fulfillment failed: ${fulfill.error}`,
        },
      });
    }
  } catch (e) {
    logger.error({ err: e.message }, "Shopify fulfillment exception");
  }

  return { ok: true, trackingNumber: tn };
}

function nextRetryDate(retryCount) {
  // 1m, 5m, 15m, then hourly — max 10 attempts handled by poller
  const minutes = retryCount <= 1 ? 1 : retryCount === 2 ? 5 : retryCount === 3 ? 15 : 60;
  return new Date(Date.now() + minutes * 60 * 1000);
}

async function cancelBookedOrder(orderId) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, error: "Order not found" };
  if (!order.postexTrackingNumber) {
    await prisma.order.update({
      where: { id: orderId },
      data: { bookingStatus: "CANCELLED", lastError: "" },
    });
    return { ok: true };
  }
  if (isAlreadyPicked(order.postexStatus)) {
    return {
      ok: false,
      error: "Parcel already picked — contact PostEx support to cancel.",
    };
  }
  const res = await postex.cancelOrder(order.postexTrackingNumber);
  if (!res.ok && res.status !== 404) {
    return { ok: false, error: res.error || "Cancel failed" };
  }
  await prisma.order.update({
    where: { id: orderId },
    data: {
      bookingStatus: "CANCELLED",
      postexStatus: "Cancelled",
      lastError: "",
    },
  });
  return { ok: true };
}

/**
 * Apply a PostEx status string onto our bookingStatus when final.
 */
function mapPostexToBookingStatus(postexStatus) {
  const s = String(postexStatus || "").toLowerCase();
  if (s.includes("delivered")) return "DELIVERED";
  if (s.includes("return")) return "RETURNED";
  if (s.includes("cancel")) return "CANCELLED";
  return null;
}

async function appendStatusHistory(order, newStatus, note) {
  let history = [];
  try {
    history = JSON.parse(order.postexStatusHistory || "[]");
  } catch {
    history = [];
  }
  if (!Array.isArray(history)) history = [];
  const last = history[history.length - 1];
  if (last && last.status === newStatus) return JSON.stringify(history);
  history.push({ status: newStatus, at: new Date().toISOString(), note: note || "" });
  return JSON.stringify(history.slice(-50));
}

module.exports = {
  upsertFromShopifyWebhook,
  bookOrder,
  cancelBookedOrder,
  mapPostexToBookingStatus,
  appendStatusHistory,
  isAlreadyPicked,
  nextRetryDate,
  getInflightBookings,
};
