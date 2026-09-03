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
    const original = file.name || "upload.webp";
    const ext = path.extname(original).slice(0, 8) || ".webp";
    const safeExt = /^\.[a-z0-9]+$/i.test(ext) ? ext.toLowerCase() : ".webp";
    const baseName = rawItemName || rawImageName || path.basename(original, ext);
    const filename = sanitizeMediaFilename(`${baseName}-${imageIndex}${safeExt}`, safeExt);

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
