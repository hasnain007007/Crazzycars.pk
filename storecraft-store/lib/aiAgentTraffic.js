/**
 * Detect AI shopping / crawler traffic from User-Agent or Referer.
 *
 * Proxy signal only:
 * - crawler bots indexing pages, OR
 * - humans clicking through from an AI chat UI.
 *
 * Detection notes (honest gaps):
 * - Gemini: human referrer gemini.google.com is real; no Gemini-specific crawler UA
 *   beyond Google-Extended (tracked separately as google_extended).
 * - Grok: grok.com / x.ai referrers are attributable. x.com / twitter.com are NOT —
 *   ordinary X link clicks share those hosts. Documented GrokBot/xAI-Grok UAs are
 *   matched if present, but independent research finds Grok often spoofs browsers.
 * - Meta AI: only meta.ai / ai.meta.com. Instagram/WhatsApp/Facebook in-app surfaces
 *   usually send facebook.com / instagram.com / empty referrer — indistinguishable
 *   from normal social traffic, so intentionally NOT attributed to Meta AI.
 * - DeepSeek: chat.deepseek.com / deepseek.com referrers. DeepSeekBot UA is matched
 *   when the string appears; DeepSeek does not publish a first-party crawler page
 *   comparable to OpenAI/Anthropic, so treat UA hits as lower-confidence.
 * - Amazonbot: crawler UA only — no verified Amazon AI chat-UI referrer for retail.
 */

export const AI_SOURCES = [
  "chatgpt",
  "copilot",
  "perplexity",
  "claude",
  "gemini",
  "grok",
  "meta",
  "deepseek",
  "you",
  "google_extended",
  "bing",
  "apple",
  "amazon",
  "bytespider",
  "other_ai",
];

const UA_RULES = [
  { source: "chatgpt", pattern: /GPTBot|ChatGPT-User|OAI-SearchBot/i },
  { source: "claude", pattern: /ClaudeBot|Claude-Web|anthropic-ai/i },
  { source: "perplexity", pattern: /PerplexityBot/i },
  { source: "google_extended", pattern: /Google-Extended/i },
  { source: "bing", pattern: /bingbot|BingPreview/i },
  { source: "apple", pattern: /Applebot-Extended|Applebot/i },
  { source: "meta", pattern: /meta-externalagent/i },
  { source: "amazon", pattern: /Amazonbot/i },
  { source: "bytespider", pattern: /Bytespider/i },
  // Documented tokens; often absent in the wild (Grok spoofs browsers).
  { source: "grok", pattern: /GrokBot|xAI-Grok|Grok-DeepSearch|Grok-User/i },
  // Third-party observed string; DeepSeek has no clear official crawler docs page.
  { source: "deepseek", pattern: /DeepSeekBot/i },
  { source: "other_ai", pattern: /CCBot|Diffbot|cohere-ai/i },
];

const REFERRER_HOSTS = [
  { source: "chatgpt", hosts: ["chat.openai.com", "chatgpt.com", "openai.com"] },
  // Do NOT match bare bing.com — that pollutes Copilot with ordinary Bing organic.
  { source: "copilot", hosts: ["copilot.microsoft.com", "copilot.cloud.microsoft"] },
  { source: "perplexity", hosts: ["perplexity.ai"] },
  { source: "claude", hosts: ["claude.ai"] },
  { source: "gemini", hosts: ["gemini.google.com", "bard.google.com"] },
  // Not x.com / twitter.com — ambiguous with ordinary X traffic.
  { source: "grok", hosts: ["grok.com", "x.ai"] },
  // Not facebook.com / instagram.com / whatsapp.com — ambiguous with social traffic.
  { source: "meta", hosts: ["meta.ai", "ai.meta.com"] },
  { source: "deepseek", hosts: ["deepseek.com", "chat.deepseek.com"] },
  { source: "you", hosts: ["you.com"] },
];

/** Host + path pairs that are AI chat UIs (not generic search). */
const REFERRER_HOST_PATHS = [
  { source: "copilot", host: "bing.com", pathIncludes: ["/chat", "/copilot", "/search?showconv=1"] },
  { source: "copilot", host: "www.bing.com", pathIncludes: ["/chat", "/copilot", "/search?showconv=1"] },
];

/** utm_source / utm_medium values that count as AI shopping referrals. */
const UTM_SOURCE_MAP = {
  chatgpt: "chatgpt",
  openai: "chatgpt",
  "chat-gpt": "chatgpt",
  copilot: "copilot",
  bingchat: "copilot",
  perplexity: "perplexity",
  claude: "claude",
  anthropic: "claude",
  gemini: "gemini",
  bard: "gemini",
  grok: "grok",
  xai: "grok",
  metaai: "meta",
  "meta-ai": "meta",
  deepseek: "deepseek",
  you: "you",
  youcom: "you",
};

const SKIP_PATH_PREFIXES = [
  "/api/",
  "/_next/",
  "/favicon",
  "/payment-logos/",
  "/robots.txt",
  "/sitemap",
  "/feed/",
  "/llms.txt",
];

export function shouldSkipAiVisitPath(pathname) {
  const p = String(pathname || "");
  if (!p || p === "/api/analytics/ai-visit") return true;
  return SKIP_PATH_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix));
}

function normalizeHost(hostname) {
  return String(hostname || "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
}

function hostFromReferrer(referrer) {
  try {
    return normalizeHost(new URL(referrer).hostname);
  } catch {
    return "";
  }
}

function hostMatches(host, ruleHost) {
  const h = normalizeHost(ruleHost);
  if (!host || !h) return false;
  return host === h || host.endsWith(`.${h}`);
}

/**
 * Best-effort query extraction from AI referrer URLs (often absent).
 */
export function extractReferrerQuery(referrer) {
  try {
    const u = new URL(referrer);
    const keys = ["q", "query", "text", "prompt", "search"];
    for (const k of keys) {
      const v = String(u.searchParams.get(k) || "").trim();
      if (v) return v.slice(0, 500);
    }
  } catch {
    /* ignore */
  }
  return "";
}

/**
 * @param {{ userAgent?: string, referrer?: string, url?: string|URL|null }} opts
 * @returns {{ matched: boolean, source: string, detection: 'user_agent'|'referrer'|'utm'|'', userAgent: string, referrer: string, referrerQuery: string } | null}
 */
export function classifyAiTraffic({ userAgent = "", referrer = "", url = null } = {}) {
  const ua = String(userAgent || "");
  const ref = String(referrer || "");

  // UTM / query params on the landing URL (share links from AI chats).
  try {
    const landing =
      url instanceof URL
        ? url
        : typeof url === "string" && url
          ? new URL(url, "https://crazzycars.pk")
          : null;
    if (landing) {
      const utmSource = String(
        landing.searchParams.get("utm_source") ||
          landing.searchParams.get("ai_source") ||
          ""
      )
        .trim()
        .toLowerCase();
      const mapped = UTM_SOURCE_MAP[utmSource];
      if (mapped) {
        return {
          matched: true,
          source: mapped,
          detection: "utm",
          userAgent: ua.slice(0, 400),
          referrer: ref.slice(0, 1000),
          referrerQuery:
            extractReferrerQuery(ref) ||
            String(landing.searchParams.get("utm_term") || landing.searchParams.get("q") || "").slice(
              0,
              500
            ),
        };
      }
    }
  } catch {
    /* ignore bad URL */
  }

  for (const rule of UA_RULES) {
    if (rule.pattern.test(ua)) {
      return {
        matched: true,
        source: rule.source,
        detection: "user_agent",
        userAgent: ua.slice(0, 400),
        referrer: ref.slice(0, 1000),
        referrerQuery: extractReferrerQuery(ref),
      };
    }
  }

  const host = hostFromReferrer(ref);
  if (host) {
    let refPath = "";
    try {
      const u = new URL(ref);
      refPath = `${u.pathname || ""}${u.search || ""}`.toLowerCase();
    } catch {
      refPath = "";
    }

    for (const rule of REFERRER_HOST_PATHS) {
      if (hostMatches(host, rule.host) && rule.pathIncludes.some((p) => refPath.includes(p))) {
        return {
          matched: true,
          source: rule.source,
          detection: "referrer",
          userAgent: ua.slice(0, 400),
          referrer: ref.slice(0, 1000),
          referrerQuery: extractReferrerQuery(ref),
        };
      }
    }

    for (const rule of REFERRER_HOSTS) {
      if (rule.hosts.some((h) => hostMatches(host, h))) {
        return {
          matched: true,
          source: rule.source,
          detection: "referrer",
          userAgent: ua.slice(0, 400),
          referrer: ref.slice(0, 1000),
          referrerQuery: extractReferrerQuery(ref),
        };
      }
    }
  }

  return null;
}
