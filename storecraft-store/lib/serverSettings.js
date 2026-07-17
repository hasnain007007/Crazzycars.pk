import { cache } from "react";
import { dbConnect } from "@/lib/db";
import { buildStoreSettingsPayload } from "@/lib/normalizeStoreSettings";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";

/**
 * Deep-convert Mongo-specific values (ObjectId, Date, Buffer) into plain
 * JSON-safe values so the payload can cross the Server -> Client Component
 * boundary in Next.js.
 */
function toPlain(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

/** Server-only: load settings once per request (layout, metadata). */
export const getServerStoreSettings = cache(async () => {
  try {
    await dbConnect();
    const doc =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
      (await Settings.findOne({}).lean()) ||
      {};
    return toPlain(buildStoreSettingsPayload(doc));
  } catch (e) {
    console.error("getServerStoreSettings error:", e);
    return buildStoreSettingsPayload({});
  }
});
