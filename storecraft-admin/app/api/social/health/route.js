/**
 * GET /api/social/health — config status (no secrets) + optional image URL probe.
 * POST /api/social/health — probe image URLs: { urls: string[] }
 */
import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessAnyCapability } from "@/lib/denyCapability";
import { getSocialConfigPublic, warnSocialConfigOnce } from "@/lib/social/config";
import { probePublicImageUrl } from "@/lib/social/imageService";
import { mediaRootWritable } from "@/lib/mediaStorage";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessAnyCapability(user, ["canManageContent", "canManageSettings"]);
    if (denied) return denied;

    warnSocialConfigOnce();
    const config = getSocialConfigPublic();
    const writable = await mediaRootWritable();

    return NextResponse.json({
      success: true,
      config,
      media: {
        writable: writable.ok,
        root: writable.root,
        error: writable.error || "",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Health check failed" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessAnyCapability(user, ["canManageContent", "canManageSettings"]);
    if (denied) return denied;

    const body = await request.json().catch(() => ({}));
    const urls = Array.isArray(body.urls) ? body.urls.map((u) => String(u || "").trim()).filter(Boolean) : [];
    if (!urls.length) {
      return NextResponse.json({ success: false, error: "urls array required" }, { status: 400 });
    }
    if (urls.length > 20) {
      return NextResponse.json({ success: false, error: "Max 20 URLs per probe" }, { status: 400 });
    }

    const results = [];
    for (const url of urls) {
      results.push({ url, ...(await probePublicImageUrl(url)) });
    }

    return NextResponse.json({
      success: true,
      allOk: results.every((r) => r.ok),
      results,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Probe failed" },
      { status: 500 }
    );
  }
}
