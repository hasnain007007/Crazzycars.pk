/**
 * Post-login redirect allowlist: internal relative paths only.
 * Rejects protocol-relative and absolute URLs (open-redirect / phishing).
 */
export function safeReturnPath(from, fallback = "/dashboard") {
  if (!from || typeof from !== "string") return fallback;
  const t = from.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return fallback;
  if (t.includes("://") || t.includes("\\")) return fallback;
  if (t.startsWith("/login")) return fallback;
  return t;
}
