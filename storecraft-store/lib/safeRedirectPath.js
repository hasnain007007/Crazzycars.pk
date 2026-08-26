/**
 * Post-login redirect allowlist: internal relative paths only.
 * Rejects protocol-relative and absolute URLs (open-redirect / phishing).
 */
export function safeRedirectPath(raw, fallback = "/account") {
  if (!raw || typeof raw !== "string") return fallback;
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return fallback;
  if (t.includes("://") || t.includes("\\")) return fallback;
  return t;
}
