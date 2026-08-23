"use strict";

/**
 * Register Shopify webhooks for this middleware.
 * Usage: APP_BASE_URL=https://xxxx.ngrok-free.app npm run register-webhooks
 */
require("dotenv").config();
const { registerWebhook } = require("../services/shopify");

async function main() {
  const base = String(process.env.APP_BASE_URL || "").replace(/\/$/, "");
  if (!base || base.includes("localhost")) {
    console.error("Set APP_BASE_URL to a public HTTPS URL (ngrok/cloudflared) before registering webhooks.");
    process.exit(1);
  }
  if (!process.env.SHOPIFY_ADMIN_API_TOKEN) {
    console.error("SHOPIFY_ADMIN_API_TOKEN is required");
    process.exit(1);
  }

  const topics = [
    ["ORDERS_CREATE", `${base}/webhooks/orders-create`],
    ["ORDERS_CANCELLED", `${base}/webhooks/orders-cancelled`],
    ["ORDERS_UPDATED", `${base}/webhooks/orders-updated`],
  ];

  for (const [topic, url] of topics) {
    console.log(`Registering ${topic} → ${url}`);
    const res = await registerWebhook(topic, url);
    if (!res.ok) {
      console.error(topic, res.error);
      console.error(JSON.stringify(res.data, null, 2));
    } else {
      const errs = res.data?.webhookSubscriptionCreate?.userErrors || [];
      if (errs.length) console.error(topic, errs);
      else console.log("OK", topic, res.data?.webhookSubscriptionCreate?.webhookSubscription?.id);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
