/**
 * Binds a password-reset token to the password hash it was issued against, so
 * the link stops working once the password changes (single use, no DB state).
 */
import crypto from "node:crypto";

export function passwordResetFingerprint(storedHash) {
  const hash = String(storedHash || "");
  if (!hash) return "";
  return crypto.createHash("sha256").update(hash).digest("hex").slice(0, 24);
}

export function passwordResetFingerprintMatches(expected, storedHash) {
  const actual = passwordResetFingerprint(storedHash);
  const a = Buffer.from(String(expected || ""));
  const b = Buffer.from(actual);
  return Boolean(actual) && a.length === b.length && crypto.timingSafeEqual(a, b);
}
