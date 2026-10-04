/**
 * Standardized mobile API response helpers.
 * Error envelope: { error: { code, message, fields? } }
 */
import { NextResponse } from "next/server";

/**
 * Return a mobile-format error response.
 * @param {string} code - Machine-readable error code
 * @param {string} message - Human-readable message
 * @param {{ status?: number, fields?: object }} opts
 */
export function mobileError(code, message, { status = 400, fields } = {}) {
  const body = { error: { code, message } };
  if (fields && typeof fields === "object") body.error.fields = fields;
  return NextResponse.json(body, { status });
}

/**
 * Return a rate-limit error response (429).
 */
export function mobileRateLimitError(remainingMs) {
  const retryAfterSec = Math.max(1, Math.ceil((remainingMs || 0) / 1000));
  return NextResponse.json(
    { error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later.", retryAfterSeconds: retryAfterSec } },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
  );
}

/**
 * Handle an error thrown by requireMobileAuth / other helpers.
 * Routes that call this should propagate auth errors directly.
 */
export function mobileAuthError(err) {
  const code = err.code || "UNAUTHORIZED";
  const message = err.message || "Authentication required.";
  const status = err.statusCode || 401;
  return mobileError(code, message, { status });
}

/**
 * Wrap a mobile route handler: catches thrown errors and maps them to mobile envelopes.
 */
export function withMobileErrorHandler(handler) {
  return async function (request, context) {
    try {
      return await handler(request, context);
    } catch (err) {
      const status = err.statusCode || 500;
      const code = err.code || "INTERNAL_ERROR";
      const message =
        status === 500
          ? "An internal error occurred. Please try again."
          : err.message || "Request failed.";
      console.error("[MobileAPI]", err.message || err);
      return mobileError(code, message, { status });
    }
  };
}
