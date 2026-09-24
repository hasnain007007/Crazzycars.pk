/**
 * Admin-side helpers to display / filter order origin labels.
 * (Attribution is stamped by the storefront at checkout.)
 */

const AI_LABELS = {
  chatgpt: "Source: Chatgpt.com",
  copilot: "Source: Copilot",
  perplexity: "Source: Perplexity.ai",
  claude: "Source: Claude.ai",
  gemini: "Source: Gemini",
  grok: "Source: Grok",
  meta: "Source: Meta.ai",
  deepseek: "Source: DeepSeek",
  you: "Source: You.com",
  google_extended: "AI: Google-Extended",
  bing: "AI: Bingbot",
  apple: "AI: Applebot",
  amazon: "AI: Amazonbot",
  bytespider: "AI: Bytespider",
  other_ai: "AI: Other",
};

export function orderOriginLabel(order) {
  const label = String(order?.attribution?.label || "").trim();
  if (label) return label;
  const ai = String(order?.aiAttributedSource || "").trim();
  if (!ai) return "";
  return AI_LABELS[ai] || `AI: ${ai}`;
}

export function serializeAttribution(attr) {
  if (!attr || typeof attr !== "object") return null;
  const plain = typeof attr.toObject === "function" ? attr.toObject() : { ...attr };
  const mapTouch = (t) => {
    if (!t || typeof t !== "object") return null;
    const p = typeof t.toObject === "function" ? t.toObject() : { ...t };
    return {
      channel: p.channel || "",
      label: p.label || "",
      source: p.source || "",
      medium: p.medium || "",
      campaign: p.campaign || "",
      content: p.content || "",
      term: p.term || "",
      referrerHost: p.referrerHost || "",
      landingPath: p.landingPath || "",
      detectedAt: p.detectedAt || null,
      detection: p.detection || "",
      hasGclid: Boolean(p.hasGclid),
      hasFbclid: Boolean(p.hasFbclid),
    };
  };
  return {
    channel: plain.channel || "",
    label: plain.label || "",
    source: plain.source || "",
    medium: plain.medium || "",
    campaign: plain.campaign || "",
    referrerHost: plain.referrerHost || "",
    landingPath: plain.landingPath || "",
    firstTouch: mapTouch(plain.firstTouch),
    lastTouch: mapTouch(plain.lastTouch),
  };
}

/** Channel filter groups for the orders list. */
export const ORIGIN_FILTER_OPTIONS = [
  { value: "all", label: "All sources" },
  { value: "direct", label: "Direct" },
  { value: "organic", label: "Organic search" },
  { value: "paid", label: "Paid ads" },
  { value: "social", label: "Social" },
  { value: "ai", label: "AI (ChatGPT, etc.)" },
  { value: "referral", label: "Referral" },
  { value: "email", label: "Email / SMS" },
  { value: "campaign", label: "Campaign / UTM" },
];

export function originFilterToMongo(origin) {
  const v = String(origin || "").trim().toLowerCase();
  if (!v || v === "all") return null;
  if (v === "direct") {
    return {
      $or: [
        { "attribution.channel": "direct" },
        {
          $and: [
            { $or: [{ attribution: null }, { attribution: { $exists: false } }, { "attribution.channel": "" }] },
            { $or: [{ aiAttributedSource: "" }, { aiAttributedSource: { $exists: false } }] },
          ],
        },
      ],
    };
  }
  if (v === "organic") return { "attribution.channel": { $regex: /^organic_/ } };
  if (v === "paid") return { "attribution.channel": { $regex: /^paid_/ } };
  if (v === "social") return { "attribution.channel": { $regex: /^social_/ } };
  if (v === "ai") {
    return {
      $or: [
        { "attribution.channel": { $regex: /^ai_/ } },
        { aiAttributedSource: { $nin: ["", null] } },
      ],
    };
  }
  if (v === "referral") return { "attribution.channel": "referral" };
  if (v === "email") return { "attribution.channel": { $in: ["email", "sms"] } };
  if (v === "campaign") return { "attribution.channel": "campaign" };
  return { "attribution.channel": v };
}
