/**
 * MongoDB-backed rate limiter for credential endpoints (login, password reset).
 *
 * Keyed on scope + email + IP rather than IP alone, so one attacker on a shared
 * office or mobile-carrier address cannot lock everyone else out. Scopes are
 * independent, so a user bouncing between login and forgot-password is not
 * charged twice for the same intent.
 *
 * The window is measured from `windowStartedAt` instead of leaning on the TTL
 * index: Mongo's TTL sweep only runs about once a minute, so expiry-by-TTL would
 * stretch lockouts past the advertised window. The TTL index is housekeeping only.
 *
 * Reads fail open and writes fail silent. Login already requires MongoDB, so a
 * limiter-specific failure means the request was going to error anyway, and we
 * would rather not turn a database hiccup into a site-wide lockout.
 */
import LoginAttempt from "@/lib/models/LoginAttempt.model";

export const MAX_FAILED_ATTEMPTS = 5;
export const WINDOW_MS = 15 * 60 * 1000;

/** Longest email we will store, to keep the compound index key bounded. */
const MAX_EMAIL_LENGTH = 200;

export function loginRateLimitKey(scope, email, ip) {
  return {
    scope,
    email: String(email || "").toLowerCase().trim().slice(0, MAX_EMAIL_LENGTH),
    ip: String(ip || "").trim() || "unknown",
  };
}

export function rateLimitMessage(retryAfterSeconds) {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Too many failed attempts. Please wait ${minutes} minute${
    minutes === 1 ? "" : "s"
  } and try again.`;
}

/**
 * @returns {Promise<{ limited: boolean, retryAfterSeconds: number }>}
 */
export async function checkLoginRateLimit(key) {
  try {
    const doc = await LoginAttempt.findOne(key).lean();
    if (!doc) return { limited: false, retryAfterSeconds: 0 };

    const expiresAt = new Date(doc.windowStartedAt).getTime() + WINDOW_MS;
    const remainingMs = expiresAt - Date.now();
    if (remainingMs <= 0) return { limited: false, retryAfterSeconds: 0 };
    if ((doc.count || 0) < MAX_FAILED_ATTEMPTS) return { limited: false, retryAfterSeconds: 0 };

    return { limited: true, retryAfterSeconds: Math.ceil(remainingMs / 1000) };
  } catch (e) {
    console.error("[loginRateLimit] check failed:", e);
    return { limited: false, retryAfterSeconds: 0 };
  }
}

export async function recordAttempt(key) {
  const now = new Date();
  const windowFloor = new Date(now.getTime() - WINDOW_MS);
  const withinWindow = {
    $gt: [{ $ifNull: ["$windowStartedAt", new Date(0)] }, windowFloor],
  };

  try {
    // Pipeline update so "increment, or start a fresh window" stays a single
    // atomic operation across concurrent serverless invocations.
    await LoginAttempt.updateOne(
      key,
      [
        {
          $set: {
            windowStartedAt: { $cond: [withinWindow, "$windowStartedAt", now] },
            count: { $cond: [withinWindow, { $add: [{ $ifNull: ["$count", 0] }, 1] }, 1] },
            lastAttemptAt: now,
          },
        },
      ],
      { upsert: true, updatePipeline: true }
    );
  } catch (e) {
    console.error("[loginRateLimit] record failed:", e);
  }
}

/** Clears the counter after credentials verify successfully. */
export async function clearLoginAttempts(key) {
  try {
    await LoginAttempt.deleteOne(key);
  } catch (e) {
    console.error("[loginRateLimit] clear failed:", e);
  }
}

export function rateLimitResponseInit(retryAfterSeconds) {
  return { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } };
}
