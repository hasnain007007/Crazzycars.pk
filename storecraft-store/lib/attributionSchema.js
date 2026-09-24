/**
 * Shared attribution touch schema for Order documents (store + admin).
 */
export const attributionTouchSchemaFields = {
  channel: { type: String, default: "", trim: true },
  label: { type: String, default: "", trim: true },
  source: { type: String, default: "", trim: true },
  medium: { type: String, default: "", trim: true },
  campaign: { type: String, default: "", trim: true },
  content: { type: String, default: "", trim: true },
  term: { type: String, default: "", trim: true },
  referrerHost: { type: String, default: "", trim: true },
  landingPath: { type: String, default: "", trim: true },
  detectedAt: { type: Date, default: null },
  detection: { type: String, default: "", trim: true },
  hasGclid: { type: Boolean, default: false },
  hasFbclid: { type: Boolean, default: false },
};

export function buildAttributionSchema(mongoose) {
  const touchSchema = new mongoose.Schema(attributionTouchSchemaFields, { _id: false });
  return new mongoose.Schema(
    {
      channel: { type: String, default: "", trim: true, index: true },
      label: { type: String, default: "", trim: true, index: true },
      source: { type: String, default: "", trim: true },
      medium: { type: String, default: "", trim: true },
      campaign: { type: String, default: "", trim: true },
      referrerHost: { type: String, default: "", trim: true },
      landingPath: { type: String, default: "", trim: true },
      firstTouch: { type: touchSchema, default: null },
      lastTouch: { type: touchSchema, default: null },
    },
    { _id: false }
  );
}

/** Human label for list/detail — prefers stamped attribution, falls back to AI field. */
export function orderOriginLabel(order) {
  const label = String(order?.attribution?.label || "").trim();
  if (label) return label;
  const ai = String(order?.aiAttributedSource || "").trim();
  if (!ai) return "";
  const map = {
    chatgpt: "Source: Chatgpt.com",
    copilot: "Source: Copilot",
    perplexity: "Source: Perplexity.ai",
    claude: "Source: Claude.ai",
    gemini: "Source: Gemini",
    grok: "Source: Grok",
    meta: "Source: Meta.ai",
    deepseek: "Source: DeepSeek",
    you: "Source: You.com",
  };
  return map[ai] || `AI: ${ai}`;
}
