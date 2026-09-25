/**
 * Instagram Business carousel / single image publishing.
 */
import { getSocialConfig } from "@/lib/social/config";
import { buildPlatformMessage, sortedImages } from "@/lib/social/captions";
import { graphRequest } from "@/lib/social/graphClient";

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function pollContainer(creationId, { dryRun, planned }) {
  if (dryRun) {
    const p = {
      label: `IG poll GET /{creation_id}?fields=status_code (dry-run skip → FINISHED)`,
      method: "GET",
      url: `https://graph.facebook.com/.../${creationId}`,
      params: { fields: "status_code", access_token: "[REDACTED]" },
    };
    planned.push(p);
    console.info("[social:dry-run]", JSON.stringify(p));
    return { ok: true, status: "FINISHED" };
  }

  const started = Date.now();
  const maxMs = 120_000;
  while (Date.now() - started < maxMs) {
    const req = await graphRequest({
      method: "GET",
      path: `/${creationId}`,
      params: { fields: "status_code" },
      dryRun: false,
      label: "IG container status_code poll",
    });
    planned.push(req.planned);
    if (!req.ok) {
      return { ok: false, error: req.message, oauth: req.oauth };
    }
    const code = String(req.data?.status_code || "").toUpperCase();
    if (code === "FINISHED") return { ok: true, status: code };
    if (code === "ERROR" || code === "EXPIRED") {
      return { ok: false, error: `Instagram container status ${code}` };
    }
    await sleep(5000);
  }
  return { ok: false, error: "Instagram container poll timed out (2 min)" };
}

/**
 * @returns {Promise<{
 *   success: boolean,
 *   skipped?: boolean,
 *   dryRun?: boolean,
 *   mediaId?: string,
 *   permalink?: string,
 *   error?: string,
 *   oauth?: boolean,
 *   planned?: object[],
 *   warnings?: string[],
 * }>}
 */
export async function publishInstagramPost(post, { dryRun, force = false } = {}) {
  const cfg = getSocialConfig();
  const useDry = dryRun != null ? Boolean(dryRun) : cfg.dryRun;
  const planned = [];
  const warnings = [];

  if (post?.results?.instagram?.mediaId && !force) {
    return {
      success: true,
      skipped: true,
      mediaId: post.results.instagram.mediaId,
      permalink: post.results.instagram.permalink || "",
    };
  }

  if (!post?.platforms?.instagram) {
    return { success: true, skipped: true };
  }

  const images = sortedImages(post);
  if (!images.length) {
    return { success: false, error: "No images for Instagram post" };
  }
  if (images.length > 10) {
    return { success: false, error: "Instagram allows max 10 carousel images" };
  }
  if (!cfg.igUserId) {
    return { success: false, error: "META_IG_USER_ID missing" };
  }

  const { message, warnings: capWarn } = buildPlatformMessage(post, "instagram");
  warnings.push(...capWarn);

  let creationId = "";

  if (images.length === 1) {
    const container = await graphRequest({
      method: "POST",
      path: `/${cfg.igUserId}/media`,
      params: {
        image_url: images[0].url,
        caption: message,
      },
      dryRun: useDry,
      label: "IG single container POST /{IG_USER_ID}/media",
    });
    planned.push(container.planned);
    if (!container.ok) {
      return {
        success: false,
        error: container.message,
        oauth: container.oauth,
        planned,
        warnings,
      };
    }
    creationId = String(container.data?.id || (useDry ? "dry-ig-single" : ""));
  } else {
    if (images.length < 2) {
      return { success: false, error: "Carousel needs 2–10 images" };
    }
    const childIds = [];
    for (let i = 0; i < images.length; i += 1) {
      const child = await graphRequest({
        method: "POST",
        path: `/${cfg.igUserId}/media`,
        params: {
          image_url: images[i].url,
          is_carousel_item: true,
        },
        dryRun: useDry,
        label: `IG carousel child ${i + 1}/${images.length}`,
      });
      planned.push(child.planned);
      if (!child.ok) {
        return {
          success: false,
          error: child.message,
          oauth: child.oauth,
          planned,
          warnings,
        };
      }
      childIds.push(String(child.data?.id || (useDry ? `dry-child-${i + 1}` : "")));
    }

    const carousel = await graphRequest({
      method: "POST",
      path: `/${cfg.igUserId}/media`,
      params: {
        media_type: "CAROUSEL",
        children: childIds.join(","),
        caption: message,
      },
      dryRun: useDry,
      label: "IG CAROUSEL container",
    });
    planned.push(carousel.planned);
    if (!carousel.ok) {
      return {
        success: false,
        error: carousel.message,
        oauth: carousel.oauth,
        planned,
        warnings,
      };
    }
    creationId = String(carousel.data?.id || (useDry ? "dry-ig-carousel" : ""));
  }

  if (!creationId) {
    return { success: false, error: "Instagram creation id missing", planned, warnings };
  }

  const polled = await pollContainer(creationId, { dryRun: useDry, planned });
  if (!polled.ok) {
    return {
      success: false,
      error: polled.error,
      oauth: polled.oauth,
      planned,
      warnings,
    };
  }

  const published = await graphRequest({
    method: "POST",
    path: `/${cfg.igUserId}/media_publish`,
    params: { creation_id: creationId },
    dryRun: useDry,
    label: "IG media_publish",
  });
  planned.push(published.planned);
  if (!published.ok) {
    return {
      success: false,
      error: published.message,
      oauth: published.oauth,
      planned,
      warnings,
    };
  }

  const mediaId = String(published.data?.id || (useDry ? "dry-ig-media" : ""));
  let permalink = "";
  if (mediaId) {
    const meta = await graphRequest({
      method: "GET",
      path: `/${mediaId}`,
      params: { fields: "permalink" },
      dryRun: useDry,
      label: "IG GET permalink",
    });
    planned.push(meta.planned);
    if (meta.ok) permalink = String(meta.data?.permalink || "");
  }

  return {
    success: true,
    dryRun: useDry,
    mediaId,
    permalink,
    planned,
    warnings,
  };
}

export async function postInstagramComment(mediaId, message, { dryRun } = {}) {
  const cfg = getSocialConfig();
  const useDry = dryRun != null ? Boolean(dryRun) : cfg.dryRun;
  if (!mediaId || !message) return { success: true, skipped: true };
  const req = await graphRequest({
    method: "POST",
    path: `/${mediaId}/comments`,
    params: { message },
    dryRun: useDry,
    label: "IG first comment",
  });
  if (!req.ok) return { success: false, error: req.message, oauth: req.oauth, planned: [req.planned] };
  return { success: true, dryRun: useDry, id: req.data?.id, planned: [req.planned] };
}
