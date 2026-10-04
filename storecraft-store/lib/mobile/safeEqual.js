import { timingSafeEqual } from "crypto";

/**
 * Constant-time string compare (length-safe).
 * Returns false when either side is empty.
 */
export function safeEqualString(a, b) {
  const aa = Buffer.from(String(a ?? ""), "utf8");
  const bb = Buffer.from(String(b ?? ""), "utf8");
  if (!aa.length || !bb.length) return false;
  const max = Math.max(aa.length, bb.length);
  const pa = Buffer.alloc(max);
  const pb = Buffer.alloc(max);
  aa.copy(pa);
  bb.copy(pb);
  const same = timingSafeEqual(pa, pb);
  return same && aa.length === bb.length;
}
