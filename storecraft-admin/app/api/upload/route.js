/**
 * Authenticated upload → local VPS media volume (permanent free hosting).
 * Returns absolute storefront URLs: {STORE_URL}/media/{folder}/{file}
 */
import path from "path";
import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessAnyCapability } from "@/lib/denyCapability";
import {
  mediaRootWritable,
  sanitizeMediaFilename,
  sanitizeMediaFolder,
  writeMediaFile,
} from "@/lib/mediaStorage";

/**
 * Extensions the admin UI actually uploads (WebP from the image pipeline, raw
 * blog images, product videos). Anything else — notably .svg / .html — is
 * refused: /media is served from the storefront origin by extension, so a
 * scriptable file there would be stored XSS on crazzycars.pk.
 */
const IMAGE_EXTS = new Set([".webp", ".jpg", ".jpeg", ".png", ".gif", ".avif", ".heic", ".heif"]);
const VIDEO_EXTS = new Set([".mp4", ".webm", ".mov", ".m4v", ".ogv", ".avi", ".mkv"]);
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_BYTES = 500 * 1024 * 1024;

export async function POST(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessAnyCapability(user, ["canManageCatalog", "canManageContent", "canManageOrders"]);
    if (denied) return denied;

    const writable = await mediaRootWritable();
    if (!writable.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Media storage not writable (${writable.root}). Mount Coolify volume at MEDIA_ROOT and chown uid 1001. See docs/MEDIA-HOSTING.md`,
          code: "media_not_writable",
        },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ success: false, error: "Missing file field." }, { status: 400 });
    }

    const original = file.name || "upload.webp";
    const ext = path.extname(original).slice(0, 8).toLowerCase() || ".webp";
    const isImage = IMAGE_EXTS.has(ext);
    if (!isImage && !VIDEO_EXTS.has(ext)) {
      return NextResponse.json(
        { success: false, error: `File type ${ext} is not allowed. Upload an image or video.` },
        { status: 415 }
      );
    }
    const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (Number(file.size) > maxBytes) {
      return NextResponse.json(
        { success: false, error: `File is too large (max ${maxBytes / (1024 * 1024)}MB).` },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!buffer.length) {
      return NextResponse.json({ success: false, error: "Empty file." }, { status: 400 });
    }

    const folder = sanitizeMediaFolder(formData.get("folder"));
    const originalSize = Number(formData.get("originalSize"));
    const finalSize = Number(formData.get("finalSize"));
    const reportedOriginal = Number.isFinite(originalSize) && originalSize > 0 ? originalSize : buffer.length;
    const reportedFinal = Number.isFinite(finalSize) && finalSize > 0 ? finalSize : buffer.length;

    const rawItemName = String(formData.get("itemName") || "").trim();
    const rawImageName = String(formData.get("imageName") || "").trim();
    const imageIndex = String(formData.get("imageIndex") || "1").trim();
    const baseName = rawItemName || rawImageName || path.basename(original, path.extname(original));
    const filename = sanitizeMediaFilename(`${baseName}-${imageIndex}${ext}`, ext);

    const saved = await writeMediaFile({ folder, filename, buffer });

    return NextResponse.json({
      success: true,
      data: {
        url: saved.url,
        publicId: saved.publicId,
        originalSize: reportedOriginal,
        finalSize: reportedFinal,
        storage: "local",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Upload failed." },
      { status: 500 }
    );
  }
}
