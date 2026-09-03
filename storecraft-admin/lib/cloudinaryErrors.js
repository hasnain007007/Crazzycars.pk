/**
 * Pure Cloudinary error classification (no SDK import — safe for unit tests).
 */
export function classifyCloudinaryError(err) {
  const msg = String(err?.error?.message || err?.message || err || "").toLowerCase();
  const http = Number(err?.error?.http_code || err?.http_code || 0);
  if (
    msg.includes("disabled customer") ||
    msg.includes("is disabled") ||
    (msg.includes("cloud_name") && msg.includes("disabled"))
  ) {
    return {
      code: "disabled",
      message:
        "Cloudinary cloud is disabled (billing/account). Reactivate in the Cloudinary console, then re-check. Product images on this cloud will not load until it is active.",
    };
  }
  if (http === 401 || msg.includes("invalid signature") || msg.includes("unauthorized")) {
    return {
      code: "auth",
      message: "Cloudinary credentials rejected. Check CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET on Coolify.",
    };
  }
  if (msg.includes("rate") || http === 429) {
    return { code: "rate_limit", message: "Cloudinary rate limit — retry shortly." };
  }
  return {
    code: "error",
    message: String(err?.error?.message || err?.message || "Cloudinary check failed").slice(0, 240),
  };
}
