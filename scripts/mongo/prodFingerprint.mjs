/**
 * Canonical production Mongo fingerprint for CrazzyCars live writes.
 * Never print connection strings. Scripts must refuse any other fingerprint.
 */
export const LIVE_DB_NAME = "crazzycars_motorsports";
/** sha256-16 of mongodb://sialkot-mongo:27017/crazzycars_motorsports */
export const LIVE_URI_FINGERPRINT = "187aad8c44fe3a84";

/** Legacy twin on same host — do not write. */
export const LEGACY_DB_NAME = "sialkot_motorsports";
/** sha256-16 of mongodb://sialkot-mongo:27017/sialkot_motorsports */
export const LEGACY_URI_FINGERPRINT = "84143ac0cb2c3085";

/** Legacy Atlas — never write. */
export const ATLAS_URI_FINGERPRINT = "317ae4de8eb24f84";

/** @deprecated use LIVE_URI_FINGERPRINT */
export const PROD_URI_FINGERPRINT = LIVE_URI_FINGERPRINT;

/**
 * @param {string} fingerprint
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function assertLiveWriteFingerprint(fingerprint) {
  const fp = String(fingerprint || "");
  if (fp === ATLAS_URI_FINGERPRINT) {
    return { ok: false, reason: "Atlas fingerprint 317ae4de8eb24f84 — never write" };
  }
  if (fp === LEGACY_URI_FINGERPRINT) {
    return {
      ok: false,
      reason: "Legacy sialkot_motorsports fingerprint 84143ac0cb2c3085 — do not write",
    };
  }
  if (fp !== LIVE_URI_FINGERPRINT) {
    return {
      ok: false,
      reason: `Fingerprint ${fp || "(empty)"} is not live ${LIVE_URI_FINGERPRINT}`,
    };
  }
  return { ok: true };
}

/**
 * @param {string} dbName
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function assertLiveWriteDbName(dbName) {
  const name = String(dbName || "");
  if (name === LEGACY_DB_NAME) {
    return { ok: false, reason: `Legacy DB ${LEGACY_DB_NAME} — do not write` };
  }
  if (name !== LIVE_DB_NAME) {
    return { ok: false, reason: `DB ${name || "(empty)"} is not live ${LIVE_DB_NAME}` };
  }
  return { ok: true };
}
