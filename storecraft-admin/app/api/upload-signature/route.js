import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessAnyCapability } from "@/lib/denyCapability";

/** Legacy Cloudinary signature — use POST /api/upload instead. */
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
