/**
 * Cache-buster for /og/p/<slug>.jpg share cards. Changes when the price or main
 * photo changes, so WhatsApp / Facebook fetch a fresh card instead of a stale price.
 * Pure (no sharp / fs) — safe to import from page metadata.
 */
export function ogCardVersion(...parts) {
  let h = 0x811c9dc5;
  const s = parts.map((x) => String(x ?? "")).join("|");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}
