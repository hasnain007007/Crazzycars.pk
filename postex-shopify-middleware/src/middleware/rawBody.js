"use strict";

/**
 * Capture raw body for Shopify HMAC. Use ONLY on webhook routes.
 */
function rawBodySaver(req, res, buf) {
  if (buf && buf.length) {
    req.rawBody = buf;
  }
}

module.exports = { rawBodySaver };
