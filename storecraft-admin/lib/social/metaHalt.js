/**
 * Persist Meta OAuth/permission halt so admin shows a red banner and publishers stop.
 */
import { dbConnect } from "@/lib/db";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";

export function isMetaOAuthError(err) {
  const code = Number(err?.code ?? err?.error?.code);
  const sub = Number(err?.error_subcode ?? err?.error?.error_subcode);
  // 190 = OAuthException / invalid token
  // 10 / 200 = permission errors
  if (code === 190 || code === 10 || code === 200) return true;
  const msg = String(err?.message || err?.error?.message || "").toLowerCase();
  if (msg.includes("oauth") && msg.includes("token")) return true;
  if (msg.includes("session has expired") || msg.includes("invalid oauth")) return true;
  void sub;
  return false;
}

export function formatGraphError(err) {
  const e = err?.error && typeof err.error === "object" ? err.error : err;
  const parts = [
    e?.message || err?.message || "Graph API error",
    e?.code != null ? `code=${e.code}` : "",
    e?.error_subcode != null ? `subcode=${e.error_subcode}` : "",
    e?.type ? `type=${e.type}` : "",
  ].filter(Boolean);
  return parts.join(" · ").slice(0, 500);
}

export async function getMetaHaltState() {
  await dbConnect();
  const doc =
    (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY })
      .select("social")
      .lean()) || null;
  const s = doc?.social || {};
  return {
    halted: Boolean(s.metaPublishingHalted),
    reason: String(s.metaHaltReason || ""),
    haltedAt: s.metaHaltedAt || null,
    schedulerEnabled: s.schedulerEnabled !== false,
  };
}

export async function haltMetaPublishing(reason) {
  await dbConnect();
  await Settings.findOneAndUpdate(
    { singletonKey: SETTINGS_SINGLETON_KEY },
    {
      $set: {
        "social.metaPublishingHalted": true,
        "social.metaHaltReason": String(reason || "Facebook token invalid").slice(0, 500),
        "social.metaHaltedAt": new Date(),
      },
    },
    { upsert: true }
  );
}

export async function clearMetaHalt() {
  await dbConnect();
  await Settings.findOneAndUpdate(
    { singletonKey: SETTINGS_SINGLETON_KEY },
    {
      $set: {
        "social.metaPublishingHalted": false,
        "social.metaHaltReason": "",
        "social.metaHaltedAt": null,
      },
    },
    { upsert: true }
  );
}
