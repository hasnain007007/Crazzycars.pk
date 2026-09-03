import { NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessAnyCapability } from "@/lib/denyCapability";
import { getMediaRoot, resolveMediaFilePath } from "@/lib/mediaStorage";

/**
 * Legacy Cloudinary signature endpoint — media now uploads via /api/upload (local VPS).
 */
export async function GET(req) {
  const user = getRequestUser(req);
  const denied = denyUnlessAnyCapability(user, ["canManageCatalog", "canManageContent"]);
  if (denied) return denied;

  return NextResponse.json(
    {
      success: false,
      error: "Cloudinary signed uploads are disabled. Use /api/upload (local VPS media).",
      code: "media_local_only",
      uploadPath: "/api/upload",
    },
    { status: 410 }
  );
}

export async function POST(req) {
  const user = getRequestUser(req);
  const denied = denyUnlessAnyCapability(user, ["canManageCatalog", "canManageContent", "canManageOrders"]);
  if (denied) return denied;

  return NextResponse.json(
    {
      success: false,
      error: "Cloudinary video thumbnails are disabled. Upload via /api/upload.",
      code: "media_local_only",
    },
    { status: 410 }
  );
}

export async function DELETE(req) {
  try {
    const user = getRequestUser(req);
    const denied = denyUnlessAnyCapability(user, ["canManageCatalog", "canManageContent", "canManageOrders"]);
    if (denied) return denied;

    const body = await req.json();
    const { publicId } = body || {};
    if (!publicId) {
      return NextResponse.json({ success: false, error: "publicId required" }, { status: 400 });
    }

    // local:products/videos/foo.mp4 → delete from MEDIA_ROOT
    const rel = String(publicId).replace(/^local:/, "");
    if (!rel || rel.includes("..")) {
      return NextResponse.json({ success: true, skipped: true });
    }
    const abs = resolveMediaFilePath(rel) || path.join(getMediaRoot(), rel);
    try {
      await unlink(abs);
    } catch {
      /* already gone */
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
