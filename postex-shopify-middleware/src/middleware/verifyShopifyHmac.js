"use strict";

const crypto = require("crypto");
const { logger } = require("../utils/logger");

/**
 * Verify X-Shopify-Hmac-Sha256 against raw request body.
 * Must run after express.raw() so req.body is a Buffer and/or req.rawBody is set.
 */
function verifyShopifyHmac(req, res, next) {
  const secret = String(process.env.SHOPIFY_WEBHOOK_SECRET || "").trim();
  const hmacHeader = req.get("X-Shopify-Hmac-Sha256") || "";

  if (!secret) {
    logger.error("SHOPIFY_WEBHOOK_SECRET is not set");
    return res.status(500).send("Webhook secret not configured");
  }

  const raw = req.rawBody || (Buffer.isBuffer(req.body) ? req.body : null);
  if (!raw) {
    logger.warn("Missing raw body for HMAC check");
    return res.status(401).send("Unauthorized");
  }

  const digest = crypto.createHmac("sha256", secret).update(raw).digest("base64");

  const a = Buffer.from(digest);
  const b = Buffer.from(hmacHeader);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    logger.warn({ topic: req.get("X-Shopify-Topic") }, "Invalid Shopify HMAC");
    return res.status(401).send("Unauthorized");
  }

  // Parse JSON for handlers
  try {
    req.shopifyPayload = JSON.parse(raw.toString("utf8"));
  } catch {
    return res.status(400).send("Invalid JSON");
  }

  next();
}

module.exports = { verifyShopifyHmac };
