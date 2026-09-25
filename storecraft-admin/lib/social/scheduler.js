/**
 * Cron tick: publish due SocialPosts with atomic lock + retries.
 */
import SocialPost from "@/lib/models/SocialPost.model";
import { publishSocialPost } from "@/lib/social/publisher";
import { getEffectiveSocialMode } from "@/lib/social/mode";
import { loadCaptionSettings } from "@/lib/social/captions";
import { getMetaHaltState } from "@/lib/social/metaHalt";

const RETRY_DELAYS_MS = [5 * 60_000, 20 * 60_000, 60 * 60_000];

function redact(obj) {
  try {
    return JSON.parse(
      JSON.stringify(obj, (k, v) =>
        /token|secret|password|authorization/i.test(String(k)) ? "[REDACTED]" : v
      )
    );
  } catch {
    return { redacted: true };
  }
}

/**
 * Process up to `limit` due posts.
 */
export async function runSocialCronTick(limit = 3) {
  const mode = await getEffectiveSocialMode();
  const halt = await getMetaHaltState();
  const captionSettings = await loadCaptionSettings();
  const now = new Date();
  const results = [];

  if (halt.halted && !mode.dryRun) {
    return {
      ok: true,
      halted: true,
      reason: halt.reason,
      processed: 0,
      results: [],
    };
  }

  for (let i = 0; i < limit; i++) {
    const post = await SocialPost.findOneAndUpdate(
      {
        status: "scheduled",
        scheduledAt: { $lte: now },
        $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: now } }],
      },
      { $set: { status: "publishing" } },
      { sort: { scheduledAt: 1 }, new: true }
    );
    if (!post) break;

    post.__captionSettings = captionSettings;

    try {
      if (mode.dryRun) {
        const planned = await publishSocialPost(post, { dryRun: true });
        post.status = "published";
        post.pushLog(
          "info",
          `Test mode: would post (payload logged). ${JSON.stringify(redact({ planned: planned.planned?.slice?.(0, 8) || planned })).slice(0, 400)}`
        );
        post.lastError = "";
        await post.save();
        results.push({ id: String(post._id), status: "posted (test)", dryRun: true });
        continue;
      }

      const out = await publishSocialPost(post, { dryRun: false });
      if (!out.success && post.status === "failed") {
        const attempt = Number(post.attempts || 0);
        if (attempt < RETRY_DELAYS_MS.length) {
          post.attempts = attempt + 1;
          post.nextRetryAt = new Date(Date.now() + RETRY_DELAYS_MS[attempt]);
          post.status = "scheduled";
          post.pushLog("warn", `Retry #${post.attempts} at ${post.nextRetryAt.toISOString()}`);
          await post.save();
          results.push({ id: String(post._id), status: "retry", nextRetryAt: post.nextRetryAt });
          continue;
        }
      }
      results.push({ id: String(post._id), status: post.status, dryRun: false });
    } catch (e) {
      post.status = "failed";
      post.lastError = e.message || "Cron publish failed";
      post.pushLog("error", post.lastError);
      await post.save();
      results.push({ id: String(post._id), status: "failed", error: post.lastError });
    }
  }

  return { ok: true, dryRun: mode.dryRun, processed: results.length, results, halted: false };
}
