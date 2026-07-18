/**
 * Single source of truth for Cloudinary cloud name (admin).
 * Prefer NEXT_PUBLIC_CLOUDINARY_CLOUD, then legacy names.
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
