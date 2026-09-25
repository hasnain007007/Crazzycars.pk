/**
 * POST /api/social/import/preview — multipart week sheet + photos (+ optional zip)
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessAnyCapability } from "@/lib/denyCapability";
import { previewImportFromParts } from "@/lib/social/importService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessAnyCapability(user, ["canManageContent", "canManageSettings"]);
    if (denied) return denied;

    await dbConnect();
    const form = await request.formData();
    const parts = [];
    for (const [, value] of form.entries()) {
      if (value && typeof value !== "string" && typeof value.arrayBuffer === "function") {
        const buf = Buffer.from(await value.arrayBuffer());
        parts.push({
          filename: value.name || "file",
          buffer: buf,
        });
      }
    }
    if (!parts.length) {
      return NextResponse.json(
        { success: false, error: "Drop your week sheet and photos (or a zip)" },
        { status: 400 }
      );
    }

    const preview = await previewImportFromParts(parts);
    // Prefer admin-proxied thumbs (auth cookie) over public /media/_imports
    preview.rows = (preview.rows || []).map((row) => ({
      ...row,
      images: (row.images || []).map((img) => ({
        ...img,
        thumbUrl: `/api/social/import/${preview.importId}/file/${img.tmpId}`,
      })),
    }));
    preview.unmatched = (preview.unmatched || []).map((img) => ({
      ...img,
      thumbUrl: `/api/social/import/${preview.importId}/file/${img.tmpId}`,
    }));

    return NextResponse.json({ success: true, ...preview });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Could not read your week sheet" },
      { status: 400 }
    );
  }
}
