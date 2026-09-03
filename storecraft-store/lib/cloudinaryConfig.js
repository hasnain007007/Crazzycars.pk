/**
 * Single source of truth for Cloudinary cloud name.
 * Prefer NEXT_PUBLIC_CLOUDINARY_CLOUD, then legacy CLOUDINARY_CLOUD_NAME /
 * NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME.
 *
 * Note: existing image URLs in Mongo may still embed older cloud IDs
 * (e.g. djmqim946, dquier8fv) in the path. Switching clouds does not rewrite
 * those URLs — migrate assets or update URLs separately. Keep one active cloud.
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

/** True when URL is Cloudinary and its cloud ≠ configured env cloud. */
export function isForeignCloudinaryUrl(url) {
  const configured = getCloudinaryCloudName();
  const fromUrl = cloudNameFromUrl(url);
  if (!configured || !fromUrl) return false;
  return fromUrl !== configured;
}
