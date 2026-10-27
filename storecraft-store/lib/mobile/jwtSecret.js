/** Mobile JWT signing key (no DB imports, so it is unit-testable). */
import { createHmac } from "node:crypto";

const MOBILE_KEY_LABEL = "crazzycars-mobile-jwt-v1";

/**
 * Mobile signing key. Prefers MOBILE_JWT_SECRET; otherwise derives a separate key from
 * JWT_SECRET with HMAC-SHA256 (one-way), so web and mobile tokens never share a key and
 * the app works without an extra env var. Throws a 500 error object when neither is set.
 */
export function getMobileJwtSecret() {
  const explicit = String(process.env.MOBILE_JWT_SECRET || "").trim();
  if (explicit) return explicit;
  const web = String(process.env.JWT_SECRET || "").trim();
  if (web.length >= 16) {
    return createHmac("sha256", web).update(MOBILE_KEY_LABEL).digest("hex");
  }
  const err = new Error("MOBILE_JWT_SECRET is not configured.");
  err.statusCode = 500;
  err.code = "CONFIG_ERROR";
  throw err;
}
