/**
 * Single source of truth for Cloudinary cloud name (admin).
 * Prefer NEXT_PUBLIC_CLOUDINARY_CLOUD, then legacy names.
 *
 * Existing Mongo URLs may still embed older cloud IDs (e.g. djmqim946).
 * Switching CLOUDINARY_CLOUD_NAME does NOT rewrite those URLs — migrate assets
 * or update Mongo separately. Prefer one active cloud for all new uploads.
 */
export function getCloudinaryCloudName() {
  return (
    String(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD || "").trim() ||
    String(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "").trim() ||
    String(process.env.CLOUDINARY_CLOUD_NAME || "").trim() ||
    ""
  );
}

export function cloudinaryUploadApiUrl(resourceType = "image") {
  const cloud = getCloudinaryCloudName();
  if (!cloud) return "";
  return `https://api.cloudinary.com/v1_1/${cloud}/${resourceType}/upload`;
}

/** Extract cloud name from a res.cloudinary.com URL, if present. */
export function cloudNameFromUrl(url) {
  const m = String(url || "").match(/res\.cloudinary\.com\/([^/]+)\//i);
  return m?.[1] || "";
}

/**
 * True when URL is Cloudinary and its cloud ≠ configured env cloud.
 * Used to warn before dual-cloud breakage repeats.
 */
export function isForeignCloudinaryUrl(url) {
  const configured = getCloudinaryCloudName();
  const fromUrl = cloudNameFromUrl(url);
  if (!configured || !fromUrl) return false;
  return fromUrl !== configured;
}
