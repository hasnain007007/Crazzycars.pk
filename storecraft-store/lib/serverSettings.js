import { cache } from "react";
import { unstable_cache } from "next/cache";
import { dbConnect } from "@/lib/db";
import { buildStoreSettingsPayload, toPublicClientSettings } from "@/lib/normalizeStoreSettings";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { isPostgresCatalog } from "@/lib/pg/enabled";
import { pgGetSettings } from "@/lib/pg/catalog";

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
    return await unstable_cache(
      async () => {
        if (isPostgresCatalog()) {
          const doc = await pgGetSettings();
          return toPlain(buildStoreSettingsPayload(doc));
        }
        await dbConnect();
        const doc =
          (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
          (await Settings.findOne({}).lean()) ||
          {};
        return toPlain(buildStoreSettingsPayload(doc));
      },
      ["server-store-settings-v1"],
      { revalidate: 60, tags: ["store-settings"] }
    )();
  } catch (e) {
    console.error("getServerStoreSettings error:", e);
    return buildStoreSettingsPayload({});
  }
});

/** Public subset safe to pass into client providers (no secrets / heavy blobs). */
export const getPublicStoreSettings = cache(async () => {
  const full = await getServerStoreSettings();
  return toPublicClientSettings(full);
});
