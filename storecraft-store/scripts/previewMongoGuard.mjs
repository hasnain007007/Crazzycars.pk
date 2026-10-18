/**
 * Pure helpers for preview Mongo isolation (no process.exit).
 * Used by assert-preview-mongo.mjs and unit tests.
 */
import { createHash } from "node:crypto";

export const PROD_DB_NAMES = new Set(["sialkot_motorsports", "sialkotmotorsports"]);
/** sha256-16 of production URI — docs/OPS-PRODUCTION-DATABASE.md */
export const PROD_URI_FINGERPRINT = "84143ac0cb2c3085";

/**
 * @param {string} uri
 * @returns {{ host: string, dbName: string, fingerprint: string, port: string }}
 */
export function parseMongoUri(uri) {
  const raw = String(uri || "").trim();
  if (!raw) throw new Error("MONGODB_URI is empty");
  let u;
  try {
    u = new URL(raw);
  } catch {
    throw new Error(`MONGODB_URI is not a valid URL: ${raw.slice(0, 48)}…`);
  }
  const host = (u.hostname || "").toLowerCase();
  const pathname = (u.pathname || "").replace(/^\//, "");
  const dbName = decodeURIComponent(pathname.split("/")[0] || "").split("?")[0];
  const fingerprint = createHash("sha256").update(raw).digest("hex").slice(0, 16);
  return { host, dbName, fingerprint, port: u.port || "27017" };
}

/**
 * @param {{ host: string, dbName: string, fingerprint: string }} target
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function evaluatePreviewMongoTarget({ host, dbName, fingerprint }) {
  if (!dbName) return { ok: false, reason: "MONGODB_URI has no database name path segment" };

  if (host === "sialkot-mongo" || host.startsWith("sialkot-mongo.")) {
    return {
      ok: false,
      reason: `host "${host}" is the production Docker Mongo service — preview must use crazzycars-preview-mongo`,
    };
  }

  if (PROD_DB_NAMES.has(String(dbName).toLowerCase())) {
    return { ok: false, reason: `database "${dbName}" is the production DB name` };
  }

  if (fingerprint === PROD_URI_FINGERPRINT) {
    return { ok: false, reason: "MONGODB_URI fingerprint matches production (84143ac0cb2c3085)" };
  }

  if (/crazzycars\.pk$/i.test(host) || /mongodb\.net$/i.test(host)) {
    return {
      ok: false,
      reason: `host "${host}" looks like a remote production/Atlas endpoint — use the private preview Mongo container only`,
    };
  }

  if (!/preview/i.test(dbName) && !/preview/i.test(host)) {
    return {
      ok: false,
      reason: `neither host nor database name contains "preview" (host=${host}, db=${dbName})`,
    };
  }

  return { ok: true };
}

/**
 * Container name checks for preview-seed.sh (Docker exec target).
 * @param {string} containerName
 */
export function evaluatePreviewMongoContainer(containerName) {
  const name = String(containerName || "").trim().toLowerCase();
  if (!name) return { ok: false, reason: "PREVIEW_MONGO_CONTAINER is empty" };
  if (name === "sialkot-mongo" || name.includes("sialkot")) {
    return { ok: false, reason: `refusing production-like container name: ${containerName}` };
  }
  if (!name.includes("preview")) {
    return { ok: false, reason: `container name must contain "preview": ${containerName}` };
  }
  return { ok: true };
}

/**
 * Target DB name for mongorestore (must be preview, never prod).
 * @param {string} dbName
 */
export function evaluatePreviewDbName(dbName) {
  const n = String(dbName || "").trim().toLowerCase();
  if (!n) return { ok: false, reason: "PREVIEW_DB is empty" };
  if (PROD_DB_NAMES.has(n)) return { ok: false, reason: `refusing production DB name: ${dbName}` };
  if (n.includes("sialkot") || n.includes("prod")) {
    return { ok: false, reason: `refusing production-like DB name: ${dbName}` };
  }
  if (!n.includes("preview")) {
    return { ok: false, reason: `PREVIEW_DB must contain "preview": ${dbName}` };
  }
  return { ok: true };
}
