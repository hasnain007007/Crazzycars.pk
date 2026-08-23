"use strict";

/**
 * Status poller + retry queue worker.
 */
const { prisma } = require("../utils/db");
const postex = require("./postex");
const bookingEngine = require("./bookingEngine");
const { logger } = require("../utils/logger");

const ACTIVE = ["BOOKED", "PENDING_BOOKING"];

function extractStatus(payload) {
  if (!payload || typeof payload !== "object") return "";
  const dist = payload.dist || payload.data || payload;
  return (
    dist.transactionStatus ||
    dist.orderStatus ||
    dist.status ||
    dist.currentStatus ||
    ""
  );
}

async function processRetries() {
  const due = await prisma.order.findMany({
    where: {
      bookingStatus: "PENDING_BOOKING",
      retryCount: { gt: 0, lt: 10 },
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }],
    },
    take: 20,
  });
  for (const order of due) {
    logger.info({ orderId: order.id, retry: order.retryCount }, "Retry booking");
    await bookingEngine.bookOrder(order.id);
  }
}

async function pollActiveStatuses() {
  const orders = await prisma.order.findMany({
    where: {
      bookingStatus: "BOOKED",
      postexTrackingNumber: { not: null },
    },
    take: 100,
  });

  if (!orders.length) return { updated: 0 };

  // Prefer bulk list when possible (last 7 days)
  const to = new Date();
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);

  let bulkMap = new Map();
  const bulk = await postex.listOrders(fromStr, toStr);
  if (bulk.ok) {
    const list =
      bulk.data?.dist ||
      bulk.data?.data ||
      bulk.data?.orders ||
      (Array.isArray(bulk.data) ? bulk.data : []);
    if (Array.isArray(list)) {
      for (const row of list) {
        const tn = String(row.trackingNumber || row.trackingNo || "").trim();
        const st = row.transactionStatus || row.orderStatus || row.status || "";
        if (tn) bulkMap.set(tn, st);
      }
    }
  }

  let updated = 0;
  for (const order of orders) {
    let status = bulkMap.get(order.postexTrackingNumber) || "";
    if (!status) {
      const tr = await postex.trackOrder(order.postexTrackingNumber);
      if (tr.ok) status = extractStatus(tr.data);
    }
    if (!status) continue;

    if (status === order.postexStatus) {
      await prisma.order.update({
        where: { id: order.id },
        data: { lastPolledAt: new Date() },
      });
      continue;
    }

    const history = await bookingEngine.appendStatusHistory(order, status, "Poller sync");
    const mapped = bookingEngine.mapPostexToBookingStatus(status);
    await prisma.order.update({
      where: { id: order.id },
      data: {
        postexStatus: status,
        postexStatusHistory: history,
        lastPolledAt: new Date(),
        ...(mapped ? { bookingStatus: mapped } : {}),
      },
    });
    updated += 1;
  }

  return { updated };
}

async function runPollerCycle() {
  logger.info("Poller cycle start");
  await processRetries();
  const result = await pollActiveStatuses();
  logger.info(result, "Poller cycle done");
  return result;
}

module.exports = { runPollerCycle, processRetries, pollActiveStatuses };
