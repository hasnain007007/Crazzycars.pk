/**
 * GET /api/social/import/[importId]/file/[tmpId] — auth-proxied temp image
 */
import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessAnyCapability } from "@/lib/denyCapability";
import { resolveTmpFile } from "@/lib/social/importService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request, context) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessAnyCapability(user, ["canManageContent", "canManageSettings"]);
    if (denied) return denied;
    const { importId, tmpId } = await context.params;
    const file = await resolveTmpFile(importId, tmpId);
    const buf = await readFile(file.abs);
    const lower = String(file.name || "").toLowerCase();
    const type = lower.endsWith(".png")
      ? "image/png"
      : lower.endsWith(".webp")
        ? "image/webp"
        : "image/jpeg";
    return new NextResponse(buf, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Not found" }, { status: 404 });
  }
}
