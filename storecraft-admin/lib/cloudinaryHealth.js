/**
 * Cloudinary account + delivery health.
 * Credentials present ≠ account active — a disabled cloud returns 401
 * "disabled customer" on Admin API and X-Cld-Error on delivery.
 */
import { v2 as cloudinary } from "cloudinary";
import { cloudNameFromUrl, getCloudinaryCloudName } from "@/lib/cloudinaryConfig";
import { classifyCloudinaryError } from "@/lib/cloudinaryErrors";

export { classifyCloudinaryError };

const CACHE_MS = 45_000;
let cached = null;

export function hasCloudinaryCredentials() {
  return Boolean(
    getCloudinaryCloudName() &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

function configure() {
  cloudinary.config({
    cloud_name: getCloudinaryCloudName(),
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

/**
 * @param {{ sampleUrl?: string, bypassCache?: boolean }} [opts]
 */
export async function checkCloudinaryHealth(opts = {}) {
  const now = Date.now();
  if (!opts.bypassCache && cached && now - cached.at < CACHE_MS) {
    return cached.result;
  }

  const cloudName = getCloudinaryCloudName();
  const started = Date.now();
  const base = {
    ok: false,
    configured: hasCloudinaryCredentials(),
    cloudName: cloudName || null,
    admin: null,
    delivery: null,
    sampleCloud: null,
    mismatchWarning: null,
    ms: 0,
    checkedAt: new Date().toISOString(),
  };

  if (!base.configured) {
    const result = {
      ...base,
      code: "missing_credentials",
      message:
        "Cloudinary credentials missing. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET (and NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME).",
      ms: Date.now() - started,
    };
    cached = { at: now, result };
    return result;
  }

  configure();

  try {
    await cloudinary.api.ping();
    base.admin = "ok";
  } catch (err) {
    const classified = classifyCloudinaryError(err);
    const result = {
      ...base,
      ...classified,
      admin: "error",
      ms: Date.now() - started,
    };
    cached = { at: now, result };
    return result;
  }

  const sampleUrl = String(opts.sampleUrl || "").trim();
  if (sampleUrl && /res\.cloudinary\.com/i.test(sampleUrl)) {
    const sampleCloud = cloudNameFromUrl(sampleUrl);
    base.sampleCloud = sampleCloud || null;
    if (sampleCloud && cloudName && sampleCloud !== cloudName) {
      base.mismatchWarning = `Sample image cloud "${sampleCloud}" differs from configured "${cloudName}". Dual-cloud catalogs break when one account is disabled.`;
    }
    try {
      const res = await fetch(sampleUrl, {
        method: "GET",
        headers: { "User-Agent": "CrazzyCarsCloudinaryHealth/1.0" },
        signal: AbortSignal.timeout(12_000),
        cache: "no-store",
      });
      const cldErr = res.headers.get("x-cld-error") || "";
      if (res.ok) {
        base.delivery = "ok";
      } else if (/disabled/i.test(cldErr) || res.status === 401) {
        const result = {
          ...base,
          ok: false,
          code: "disabled",
          delivery: "error",
          message:
            cldErr ||
            "Cloudinary delivery returned unauthorized — cloud may be disabled even if Admin briefly answered.",
          ms: Date.now() - started,
        };
        cached = { at: now, result };
        return result;
      } else {
        base.delivery = "error";
        base.message = `Delivery HTTP ${res.status}${cldErr ? `: ${cldErr}` : ""}`.slice(0, 240);
      }
    } catch (err) {
      base.delivery = "error";
      base.message = String(err?.message || err).slice(0, 240);
    }
  } else {
    base.delivery = "skipped";
  }

  const result = {
    ...base,
    ok: base.admin === "ok" && (base.delivery === "ok" || base.delivery === "skipped"),
    code: base.admin === "ok" && base.delivery !== "error" ? "ok" : "delivery_error",
    message:
      base.admin === "ok" && (base.delivery === "ok" || base.delivery === "skipped")
        ? "Cloudinary account and credentials are healthy."
        : base.message || "Cloudinary Admin OK but delivery probe failed.",
    ms: Date.now() - started,
  };
  cached = { at: now, result };
  return result;
}

/** Clear cached status (after env change / manual refresh). */
export function clearCloudinaryHealthCache() {
  cached = null;
}
