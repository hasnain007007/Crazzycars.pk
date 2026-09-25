/**
 * GET/POST /api/social/meta — token verify + OAuth halt banner state
 */
import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessAnyCapability } from "@/lib/denyCapability";
import { getSocialConfigPublic } from "@/lib/social/config";
import { clearMetaHalt, getMetaHaltState, haltMetaPublishing } from "@/lib/social/metaHalt";
import { verifyMetaToken } from "@/lib/social/graphClient";

export const dynamic = "force-dynamic";

async function requireUser(request) {
  const user = getRequestUser(request);
  return denyUnlessAnyCapability(user, ["canManageContent", "canManageSettings"]) || user;
}

export async function GET(request) {
  try {
    const userOrDenied = await requireUser(request);
    if (userOrDenied instanceof NextResponse) return userOrDenied;

    return NextResponse.json({
      success: true,
      config: getSocialConfigPublic(),
      halt: await getMetaHaltState(),
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const userOrDenied = await requireUser(request);
    if (userOrDenied instanceof NextResponse) return userOrDenied;

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "verify").trim();

    if (action === "clear-halt") {
      await clearMetaHalt();
      return NextResponse.json({ success: true, cleared: true, halt: await getMetaHaltState() });
    }

    const halt = await getMetaHaltState();
    const config = getSocialConfigPublic();
    const verify = await verifyMetaToken();
    if (!verify.ok && verify.oauth) {
      await haltMetaPublishing(verify.message || "Token verify failed");
    }
    return NextResponse.json({
      success: Boolean(verify.ok),
      config,
      halt: await getMetaHaltState(),
      verify: verify.ok
        ? { page: verify.page, instagram: verify.instagram, igError: verify.igError }
        : { error: verify.message || verify.error, oauth: verify.oauth },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed" }, { status: 500 });
  }
}
