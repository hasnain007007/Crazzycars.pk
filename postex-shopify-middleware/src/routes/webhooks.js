"use strict";

/**
 * Shopify webhooks — respond fast, process async.
 */
const express = require("express");
const { verifyShopifyHmac } = require("../middleware/verifyShopifyHmac");
const { rawBodySaver } = require("../middleware/rawBody");
const { prisma } = require("../utils/db");
const bookingEngine = require("../services/bookingEngine");
const { getRuntimeSettings } = require("../services/settings");
const { logger } = require("../utils/logger");

const router = express.Router();

// Raw body only for these routes (mounted with express.raw in server.js)
router.use(
  express.raw({ type: "*/*", verify: rawBodySaver, limit: "2mb" }),
  verifyShopifyHmac
);

function queueWork(fn) {
  setImmediate(() => {
    Promise.resolve()
      .then(fn)
      .catch((e) => logger.error({ err: e.message }, "Webhook async work failed"));
  });
}

router.post("/orders-create", async (req, res) => {
  const payload = req.shopifyPayload;
  res.status(200).send("ok");

  queueWork(async () => {
    await prisma.webhookLog.create({
      data: {
        topic: "orders/create",
        shopifyOrderId: String(payload.id || ""),
        rawPayload: JSON.stringify(payload).slice(0, 50000),
        hmacValid: true,
      },
    });
    const order = await bookingEngine.upsertFromShopifyWebhook(payload);
    const settings = await getRuntimeSettings();
    if (settings.autoBook) {
      await bookingEngine.bookOrder(order.id);
    }
  });
});

router.post("/orders-cancelled", async (req, res) => {
  const payload = req.shopifyPayload;
  res.status(200).send("ok");

  queueWork(async () => {
    await prisma.webhookLog.create({
      data: {
        topic: "orders/cancelled",
        shopifyOrderId: String(payload.id || ""),
        rawPayload: JSON.stringify(payload).slice(0, 20000),
        hmacValid: true,
      },
    });
    const existing = await prisma.order.findUnique({
      where: { shopifyOrderId: String(payload.id) },
    });
    if (!existing) return;
    if (existing.postexTrackingNumber) {
      await bookingEngine.cancelBookedOrder(existing.id);
    } else {
      await prisma.order.update({
        where: { id: existing.id },
        data: { bookingStatus: "CANCELLED" },
      });
    }
  });
});

router.post("/orders-updated", async (req, res) => {
  const payload = req.shopifyPayload;
  res.status(200).send("ok");

  queueWork(async () => {
    await prisma.webhookLog.create({
      data: {
        topic: "orders/updated",
        shopifyOrderId: String(payload.id || ""),
        rawPayload: JSON.stringify(payload).slice(0, 20000),
        hmacValid: true,
      },
    });
    await bookingEngine.upsertFromShopifyWebhook(payload);
  });
});

module.exports = router;
