"use strict";

/**
 * Shopify Admin API helpers (REST webhooks + GraphQL fulfillments).
 */
const { logger, maskSecrets } = require("../utils/logger");
const { prisma } = require("../utils/db");

function storeDomain() {
  return String(process.env.SHOPIFY_STORE_DOMAIN || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
}

function apiVersion() {
  return String(process.env.SHOPIFY_API_VERSION || "2025-07").trim();
}

function adminToken() {
  return String(process.env.SHOPIFY_ADMIN_API_TOKEN || "").trim();
}

function trackingPublicUrl(cn) {
  return `https://postex.pk/tracking?cn=${encodeURIComponent(cn)}`;
}

async function shopifyGraphql(query, variables = {}) {
  const domain = storeDomain();
  const token = adminToken();
  if (!domain || !token) {
    return { ok: false, error: "Shopify store domain or admin token missing", data: null };
  }

  const url = `https://${domain}/admin/api/${apiVersion()}/graphql.json`;
  const started = Date.now();

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    const durationMs = Date.now() - started;

    try {
      await prisma.apiLog.create({
        data: {
          direction: "outbound",
          endpoint: `SHOPIFY GraphQL ${apiVersion()}`,
          requestBody: maskSecrets({ query: query.slice(0, 200), variables }),
          responseBody: maskSecrets(json),
          statusCode: res.status,
          durationMs,
        },
      });
    } catch {
      /* ignore log failure */
    }

    if (!res.ok || json.errors) {
      const err =
        (json.errors && json.errors[0]?.message) ||
        `Shopify GraphQL HTTP ${res.status}`;
      logger.error({ err, json: maskSecrets(json) }, "Shopify GraphQL error");
      return { ok: false, error: err, data: json };
    }
    return { ok: true, error: null, data: json.data };
  } catch (e) {
    logger.error({ err: e.message }, "Shopify network error");
    return { ok: false, error: e.message, data: null };
  }
}

/**
 * Create a fulfillment with PostEx tracking and notify the customer.
 */
async function fulfillOrderWithTracking(shopifyOrderId, trackingNumber) {
  const gid = String(shopifyOrderId).startsWith("gid://")
    ? String(shopifyOrderId)
    : `gid://shopify/Order/${shopifyOrderId}`;

  const foQuery = `
    query ($id: ID!) {
      order(id: $id) {
        id
        displayFulfillmentStatus
        fulfillmentOrders(first: 10) {
          nodes {
            id
            status
            lineItems(first: 50) {
              nodes {
                id
                remainingQuantity
              }
            }
          }
        }
      }
    }
  `;

  const foRes = await shopifyGraphql(foQuery, { id: gid });
  if (!foRes.ok) return foRes;

  const order = foRes.data?.order;
  if (!order) return { ok: false, error: "Shopify order not found", data: null };

  const openFo = (order.fulfillmentOrders?.nodes || []).find(
    (n) => n.status === "OPEN" || n.status === "IN_PROGRESS"
  );

  if (!openFo) {
    return {
      ok: true,
      skipped: true,
      error: null,
      data: { reason: "No open fulfillment order (already fulfilled?)" },
    };
  }

  const lineItems = (openFo.lineItems?.nodes || [])
    .filter((li) => Number(li.remainingQuantity) > 0)
    .map((li) => ({
      id: li.id,
      quantity: Number(li.remainingQuantity) || 1,
    }));

  if (!lineItems.length) {
    return { ok: true, skipped: true, error: null, data: { reason: "No remaining line items" } };
  }

  const mutation = `
    mutation fulfillmentCreate($fulfillment: FulfillmentInput!) {
      fulfillmentCreate(fulfillment: $fulfillment) {
        fulfillment {
          id
          status
          trackingInfo {
            number
            company
            url
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    fulfillment: {
      lineItemsByFulfillmentOrder: [
        {
          fulfillmentOrderId: openFo.id,
          fulfillmentOrderLineItems: lineItems,
        },
      ],
      trackingInfo: {
        number: String(trackingNumber),
        company: "PostEx",
        url: trackingPublicUrl(trackingNumber),
      },
      notifyCustomer: true,
    },
  };

  const createRes = await shopifyGraphql(mutation, variables);
  if (!createRes.ok) return createRes;

  const payload = createRes.data?.fulfillmentCreate;
  const userErrors = payload?.userErrors || [];
  if (userErrors.length) {
    return {
      ok: false,
      error: userErrors.map((e) => e.message).join("; "),
      data: payload,
    };
  }

  const fulfillmentId = payload?.fulfillment?.id || "";
  return { ok: true, error: null, data: { fulfillmentId, fulfillment: payload?.fulfillment } };
}

/**
 * Register webhooks via Shopify GraphQL.
 */
async function registerWebhook(topic, callbackUrl) {
  const mutation = `
    mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
      webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
        webhookSubscription { id topic endpoint { __typename ... on WebhookHttpEndpoint { callbackUrl } } }
        userErrors { field message }
      }
    }
  `;
  return shopifyGraphql(mutation, {
    topic,
    webhookSubscription: { callbackUrl, format: "JSON" },
  });
}

module.exports = {
  shopifyGraphql,
  fulfillOrderWithTracking,
  registerWebhook,
  trackingPublicUrl,
  storeDomain,
  apiVersion,
};
