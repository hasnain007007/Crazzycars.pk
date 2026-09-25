/**
 * Effective dry-run: env SOCIAL_DRY_RUN=true forces test mode.
 * Otherwise SocialSettings.dryRun applies.
 */
import { getSocialConfig } from "@/lib/social/config";
import SocialSettings from "@/lib/models/SocialSettings.model";

export async function getEffectiveSocialMode() {
  const env = getSocialConfig();
  const envForced = process.env.SOCIAL_DRY_RUN != null && String(process.env.SOCIAL_DRY_RUN).trim() !== ""
    ? env.dryRun
    : null;

  let dbDryRun = true;
  try {
    const settings = await SocialSettings.getOrCreate();
    dbDryRun = settings.dryRun !== false;
  } catch {
    dbDryRun = true;
  }

  // Env true = forced test. Env false = allow DB toggle. Env unset = config default true.
  const envRaw = process.env.SOCIAL_DRY_RUN;
  let dryRun;
  let locked = false;
  let lockReason = "";

  if (envRaw != null && String(envRaw).trim() !== "") {
    const forced = /^(1|true|yes|on)$/i.test(String(envRaw).trim());
    if (forced) {
      dryRun = true;
      locked = true;
      lockReason = "SOCIAL_DRY_RUN=true in Coolify (master switch). Set to false to allow Live mode.";
    } else {
      dryRun = dbDryRun;
      locked = false;
    }
  } else {
    // default config dryRun true
    dryRun = true;
    locked = true;
    lockReason = "SOCIAL_DRY_RUN not set — default Test mode. Set SOCIAL_DRY_RUN=false in Coolify to unlock Live.";
  }

  return {
    dryRun,
    locked,
    lockReason,
    dbDryRun,
    envDryRun: env.dryRun,
    tiktokMode: env.tiktokMode,
    metaReady: env.metaReady,
    enabled: env.enabled,
    timezone: env.timezone,
    defaultSlots: env.defaultSlots,
  };
}
