/**
 * Meta click-id helpers safe for Edge middleware (no Node/mongoose imports).
 */

/** Build Meta `_fbc` from fbclid: fb.1.{ms}.{fbclid} */
export function buildFbcFromFbclid(fbclid, createdAtMs = Date.now()) {
  const id = String(fbclid || "").trim();
  if (!id) return "";
  return `fb.1.${Math.floor(Number(createdAtMs) || Date.now())}.${id}`;
}
