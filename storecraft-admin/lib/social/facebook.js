/**
 * Facebook Page publishing (multi-photo album or single photo).
 */
import { getSocialConfig } from "@/lib/social/config";
import { buildPlatformMessage, sortedImages } from "@/lib/social/captions";
import { graphRequest } from "@/lib/social/graphClient";

/**
 * @returns {Promise<{
 *   success: boolean,
 *   skipped?: boolean,
 *   dryRun?: boolean,
 *   postId?: string,
 *   url?: string,
 *   error?: string,
 *   oauth?: boolean,
 *   planned?: object[],
 *   warnings?: string[],
 * }>}
 */
export async function publishFacebookPost(post, { dryRun, force = false } = {}) {
  const cfg = getSocialConfig();
  const useDry = dryRun != null ? Boolean(dryRun) : cfg.dryRun;
  const planned = [];
  const warnings = [];

  if (post?.results?.facebook?.postId && !force) {
    return {
      success: true,
      skipped: true,
      postId: post.results.facebook.postId,
      url: post.results.facebook.url || `https://facebook.com/${post.results.facebook.postId}`,
    };
  }

  if (!post?.platforms?.facebook) {
    return { success: true, skipped: true };
  }

  const images = sortedImages(post);
  if (!images.length) {
    return { success: false, error: "No images for Facebook post" };
  }

  if (!cfg.pageId) {
    return { success: false, error: "META_PAGE_ID missing" };
  }

  const { message, warnings: capWarn } = buildPlatformMessage(post, "facebook");
  warnings.push(...capWarn);

  // Single photo
  if (images.length === 1) {
    const req = await graphRequest({
      method: "POST",
      path: `/${cfg.pageId}/photos`,
      params: {
        url: images[0].url,
        caption: message,
        published: true,
      },
      dryRun: useDry,
      label: "FB single photo POST /{PAGE_ID}/photos",
    });
    planned.push(req.planned);
    if (!req.ok) {
      return {
        success: false,
        error: req.message,
        oauth: req.oauth,
        planned,
        warnings,
      };
    }
    const postId = String(req.data?.post_id || req.data?.id || "");
    return {
      success: true,
      dryRun: useDry,
      postId,
      url: postId ? `https://facebook.com/${postId}` : "",
      planned,
      warnings,
      raw: req.data,
    };
  }

  // Multi-photo: unpublished photos → feed with attached_media
  const mediaFbids = [];
  for (let i = 0; i < images.length; i += 1) {
    const req = await graphRequest({
      method: "POST",
      path: `/${cfg.pageId}/photos`,
      params: {
        url: images[i].url,
        published: false,
      },
      dryRun: useDry,
      label: `FB unpublished photo ${i + 1}/${images.length}`,
    });
    planned.push(req.planned);
    if (!req.ok) {
      return {
        success: false,
        error: req.message,
        oauth: req.oauth,
        planned,
        warnings,
      };
    }
    const id = String(req.data?.id || (useDry ? `dry-photo-${i + 1}` : ""));
    if (!id) {
      return { success: false, error: "Facebook photo upload returned no id", planned, warnings };
    }
    mediaFbids.push(id);
  }

  const attachedParams = {};
  mediaFbids.forEach((id, i) => {
    attachedParams[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id });
  });
  const feed = await graphRequest({
    method: "POST",
    path: `/${cfg.pageId}/feed`,
    params: {
      message,
      ...attachedParams,
    },
    dryRun: useDry,
    label: "FB multi-photo POST /{PAGE_ID}/feed",
  });
  planned.push(feed.planned);
  if (!feed.ok) {
    return {
      success: false,
      error: feed.message,
      oauth: feed.oauth,
      planned,
      warnings,
    };
  }

  const postId = String(feed.data?.id || "");
  return {
    success: true,
    dryRun: useDry,
    postId,
    url: postId ? `https://facebook.com/${postId}` : "",
    planned,
    warnings,
    raw: feed.data,
  };
}

export async function postFacebookComment(postId, message, { dryRun } = {}) {
  const cfg = getSocialConfig();
  const useDry = dryRun != null ? Boolean(dryRun) : cfg.dryRun;
  if (!postId || !message) return { success: true, skipped: true };
  const req = await graphRequest({
    method: "POST",
    path: `/${postId}/comments`,
    params: { message },
    dryRun: useDry,
    label: "FB first comment",
  });
  if (!req.ok) return { success: false, error: req.message, oauth: req.oauth, planned: [req.planned] };
  return { success: true, dryRun: useDry, id: req.data?.id, planned: [req.planned] };
}
