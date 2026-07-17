/** Normalize redirect paths for storage and comparison. */
export function normalizeFromPath(raw) {
  let s = String(raw || "").trim();
  if (!s) return "/";
  if (!s.startsWith("/")) s = `/${s}`;
  if (s.length > 1) s = s.replace(/\/+$/, "");
  return s || "/";
}

export function normalizeToPath(raw) {
  const s = String(raw || "").trim();
  if (!s) return "/";
  if (/^https?:\/\//i.test(s)) return s;
  let out = s;
  if (!out.startsWith("/")) out = `/${out}`;
  return out;
}
