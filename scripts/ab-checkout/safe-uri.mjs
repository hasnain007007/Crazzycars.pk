/**
 * Refuse non-throwaway / production Mongo URIs for A/B harness.
 */
const PRODUCTION_DB = /\bsialkot_motorsports\b/i;
const PRODUCTION_HINT = /\b(production|prod-mongo|sialkot-mongo)\b/i;
const THROWAYWAY_DB = /(ab|test|preview)/i;

export function assertThrowawayMongoUri(uri, label = "MONGODB_URI") {
  const raw = String(uri || "").trim();
  if (!raw) throw new Error(`${label}: missing`);

  let dbName = "";
  try {
    const u = new URL(raw);
    dbName = (u.pathname || "").replace(/^\//, "").split("/")[0] || "";
  } catch {
    const m = raw.match(/\/([^/?]+)(\?|$)/);
    dbName = m?.[1] || "";
  }

  const hay = `${raw}\n${dbName}`;
  if (PRODUCTION_DB.test(hay)) {
    throw new Error(`${label}: refuses production DB name (sialkot_motorsports)`);
  }
  if (PRODUCTION_HINT.test(hay) && !THROWAYWAY_DB.test(dbName)) {
    throw new Error(`${label}: refuses URI that looks like production without a throwaway DB name`);
  }
  if (!THROWAYWAY_DB.test(dbName)) {
    throw new Error(
      `${label}: DB name "${dbName || "(empty)"}" must look throwaway (contain "ab", "test", or "preview")`
    );
  }
  return { uri: raw, dbName };
}
