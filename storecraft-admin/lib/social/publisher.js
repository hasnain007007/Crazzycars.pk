/**
 * Orchestrate Facebook + Instagram publish for one SocialPost.
 */
import { getSocialConfig } from "@/lib/social/config";
import { getMetaHaltState, haltMetaPublishing } from "@/lib/social/metaHalt";
import { publishFacebookPost, postFacebookComment } from "@/lib/social/facebook";
import { publishInstagramPost, postInstagramComment } from "@/lib/social/instagram";
import { sortedImages, loadCaptionSettings } from "@/lib/social/captions";

function pushLog(post, level, msg) {
  if (typeof post.pushLog === "function") post.pushLog(level, msg);
}

/**
 * @param {import('mongoose').Document} post — SocialPost document
 * @param {{ dryRun?: boolean, force?: boolean, platforms?: { facebook?: boolean, instagram?: boolean } }} opts
 */
export async function publishSocialPost(post, opts = {}) {
  const cfg = getSocialConfig();
  const dryRun = opts.dryRun != null ? Boolean(opts.dryRun) : cfg.dryRun;
  const force = Boolean(opts.force);
  const plannedAll = [];
  const warnings = [];

  if (!post.__captionSettings) {
    try {
      post.__captionSettings = await loadCaptionSettings();
    } catch {
      post.__captionSettings = null;
    }
  }

  if (!sortedImages(post).length) {
    return { success: false, error: "Post has no images", dryRun };
  }

  const halt = await getMetaHaltState();
  if (halt.halted && !dryRun) {
    return {
      success: false,
      error: `Meta publishing halted: ${halt.reason || "replace META_PAGE_TOKEN"}`,
      halted: true,
      dryRun,
    };
  }

  const wantFb = opts.platforms?.facebook !== false && post.platforms?.facebook !== false;
  const wantIg = opts.platforms?.instagram !== false && post.platforms?.instagram !== false;

  post.status = "publishing";
  pushLog(post, "info", dryRun ? "Dry-run publish started" : "Publish started");
  await post.save();

  let fb = { success: true, skipped: true };
  let ig = { success: true, skipped: true };

  if (wantFb) {
    fb = await publishFacebookPost(post, { dryRun, force });
    if (fb.planned) plannedAll.push(...fb.planned);
    if (fb.warnings) warnings.push(...fb.warnings);
    if (fb.oauth) {
      await haltMetaPublishing(fb.error || "Facebook OAuth/token error");
      pushLog(post, "error", `Meta halted (FB): ${fb.error}`);
    }
    if (fb.success && !fb.skipped) {
      post.results = post.results || {};
      post.results.facebook = {
        postId: fb.postId || "",
        url: fb.url || "",
        at: new Date(),
        error: "",
      };
      pushLog(
        post,
        "info",
        dryRun ? `FB dry-run ok (${fb.postId})` : `FB published ${fb.postId}`
      );
      const comment = String(post.firstComment || "").trim();
      if (comment && fb.postId && !dryRun) {
        const c = await postFacebookComment(fb.postId, comment, { dryRun });
        if (c.planned) plannedAll.push(...c.planned);
        if (!c.success) pushLog(post, "warn", `FB comment failed: ${c.error}`);
      } else if (comment && dryRun) {
        plannedAll.push({
          label: "FB first comment (would POST)",
          method: "POST",
          path: `/{postId}/comments`,
          params: { message: comment.slice(0, 80) + (comment.length > 80 ? "…" : "") },
        });
      }
    } else if (!fb.success && !fb.skipped) {
      post.results = post.results || {};
      post.results.facebook = {
        ...(post.results.facebook?.toObject?.() || post.results.facebook || {}),
        error: fb.error || "Facebook failed",
        at: new Date(),
      };
      pushLog(post, "error", `FB failed: ${fb.error}`);
    }
  }

  if (wantIg && !(fb.oauth && !dryRun)) {
    ig = await publishInstagramPost(post, { dryRun, force });
    if (ig.planned) plannedAll.push(...ig.planned);
    if (ig.warnings) warnings.push(...ig.warnings);
    if (ig.oauth) {
      await haltMetaPublishing(ig.error || "Instagram OAuth/token error");
      pushLog(post, "error", `Meta halted (IG): ${ig.error}`);
    }
    if (ig.success && !ig.skipped) {
      post.results = post.results || {};
      post.results.instagram = {
        mediaId: ig.mediaId || "",
        permalink: ig.permalink || "",
        at: new Date(),
        error: "",
      };
      pushLog(
        post,
        "info",
        dryRun ? `IG dry-run ok (${ig.mediaId})` : `IG published ${ig.mediaId}`
      );
      const comment = String(post.firstComment || "").trim();
      if (comment && ig.mediaId && !dryRun) {
        const c = await postInstagramComment(ig.mediaId, comment, { dryRun });
        if (c.planned) plannedAll.push(...c.planned);
        if (!c.success) pushLog(post, "warn", `IG comment failed: ${c.error}`);
      }
    } else if (!ig.success && !ig.skipped) {
      post.results = post.results || {};
      post.results.instagram = {
        ...(post.results.instagram?.toObject?.() || post.results.instagram || {}),
        error: ig.error || "Instagram failed",
        at: new Date(),
      };
      pushLog(post, "error", `IG failed: ${ig.error}`);
    }
  }

  const fbOk = !wantFb || fb.skipped || fb.success;
  const igOk = !wantIg || ig.skipped || ig.success;
  const fbFail = wantFb && !fb.skipped && !fb.success;
  const igFail = wantIg && !ig.skipped && !ig.success;
  const anyOk =
    (wantFb && fb.success && !fb.skipped) || (wantIg && ig.success && !ig.skipped);

  if (dryRun) {
    // Dry-run does not change published status permanently
    post.status = post.scheduledAt ? "scheduled" : "draft";
    pushLog(post, "info", `Dry-run finished (${plannedAll.length} planned Graph calls)`);
  } else if (fbOk && igOk && anyOk) {
    post.status = "published";
    post.lastError = "";
  } else if (anyOk && (fbFail || igFail)) {
    post.status = "partial";
    post.lastError = [fbFail && fb.error, igFail && ig.error].filter(Boolean).join(" | ");
  } else if (fbFail || igFail) {
    post.status = "failed";
    post.lastError = [fbFail && fb.error, igFail && ig.error].filter(Boolean).join(" | ");
  } else {
    post.status = post.scheduledAt ? "scheduled" : "draft";
  }

  post.markModified("results");
  await post.save();

  return {
    success: dryRun ? true : Boolean(anyOk && !fb.oauth && !ig.oauth),
    dryRun,
    halted: Boolean(fb.oauth || ig.oauth),
    facebook: fb,
    instagram: ig,
    planned: plannedAll,
    warnings,
    status: post.status,
    postId: String(post._id),
  };
}
