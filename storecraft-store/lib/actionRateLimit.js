/**
 * Generic action rate limiter (checkout / contact / reviews).
 * Reuses LoginAttempt documents; keyed by scope + email + IP.
 * Reads fail open; writes fail silent (same posture as loginRateLimit).
 */
import LoginAttempt from "@/lib/models/LoginAttempt.model";

const MAX_EMAIL_LENGTH = 200;

export function actionRateLimitKey(scope, email, ip) {
  return {
    scope: String(scope || "action").trim() || "action",
    email: String(email || "anon").trim().toLowerCase().slice(0, MAX_EMAIL_LENGTH) || "anon",
    ip: String(ip || "unknown").trim() || "unknown",
  };
}

/**
 * @param {{ scope: string, email: string, ip: string }} key
 * @param {{ maxAttempts: number, windowMs: number }} opts
 */
export async function checkActionRateLimit(key, { maxAttempts, windowMs }) {
  try {
    const row = await LoginAttempt.findOne(key).lean();
    if (!row) {
      return { limited: false, remainingMs: 0, attempts: 0 };
    }

    const started = new Date(row.windowStartedAt).getTime();
    const age = Date.now() - started;
    if (!Number.isFinite(started) || age >= windowMs) {
      return { limited: false, remainingMs: 0, attempts: 0 };
    }

    const attempts = Number(row.count) || 0;
    if (attempts >= maxAttempts) {
      return {
        limited: true,
        remainingMs: Math.max(0, windowMs - age),
        attempts,
      };
    }

    return { limited: false, remainingMs: 0, attempts };
  } catch (e) {
    console.error("[actionRateLimit] check failed:", e);
    return { limited: false, remainingMs: 0, attempts: 0 };
  }
}

/**
 * Count one attempt. Resets the window when expired.
 * @param {{ scope: string, email: string, ip: string }} key
 * @param {{ windowMs: number }} opts
 */
export async function recordActionAttempt(key, { windowMs }) {
  const now = new Date();
  const windowFloor = new Date(now.getTime() - windowMs);
  const withinWindow = {
    $gt: [{ $ifNull: ["$windowStartedAt", new Date(0)] }, windowFloor],
  };

  try {
    await LoginAttempt.updateOne(
      key,
      [
        {
          $set: {
            scope: key.scope,
            email: key.email,
            ip: key.ip,
            windowStartedAt: { $cond: [withinWindow, "$windowStartedAt", now] },
            count: { $cond: [withinWindow, { $add: [{ $ifNull: ["$count", 0] }, 1] }, 1] },
            lastAttemptAt: now,
          },
        },
      ],
      { upsert: true, updatePipeline: true }
    );
  } catch (e) {
    console.error("[actionRateLimit] record failed:", e);
  }
}

export function rateLimitResponse(remainingMs, message) {
  const retryAfterSec = Math.max(1, Math.ceil(remainingMs / 1000));
  return Response.json(
    {
      success: false,
      error: message || "Too many requests. Please try again later.",
      code: "RATE_LIMITED",
      retryAfterSeconds: retryAfterSec,
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    }
  );
}
