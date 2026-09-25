/**
 * GET /api/social/health — config status (no secrets) + next post + mode.
 * POST /api/social/health — probe image URLs: { urls: string[] }
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessAnyCapability } from "@/lib/denyCapability";
import { getSocialConfigPublic, warnSocialConfigOnce } from "@/lib/social/config";
import { probePublicImageUrl } from "@/lib/social/imageService";
import { mediaRootWritable } from "@/lib/mediaStorage";
import { getEffectiveSocialMode } from "@/lib/social/mode";
import { getMetaHaltState } from "@/lib/social/metaHalt";
import SocialPost from "@/lib/models/SocialPost.model";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessAnyCapability(user, ["canManageContent", "canManageSettings"]);
    if (denied) return denied;

    warnSocialConfigOnce();
    await dbConnect();
    const config = getSocialConfigPublic();
    const writable = await mediaRootWritable();
    const mode = await getEffectiveSocialMode();
    const halt = await getMetaHaltState();

    const next = await SocialPost.findOne({
      status: "scheduled",
      scheduledAt: { $gte: new Date() },
    })
      .sort({ scheduledAt: 1 })
      .select({ scheduledAt: 1, title: 1, headline: 1 })
      .lean();

    let nextPostIn = null;
    if (next?.scheduledAt) {
      const ms = new Date(next.scheduledAt).getTime() - Date.now();
      const mins = Math.max(0, Math.round(ms / 60000));
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      nextPostIn = h > 0 ? `${h}h ${m}m` : `${m}m`;
    }

    return NextResponse.json({
      success: true,
      config,
      mode: {
        dryRun: mode.dryRun,
        locked: mode.locked,
        lockReason: mode.lockReason,
        tiktokMode: mode.tiktokMode,
        metaReady: mode.metaReady,
      },
      facebook: { connected: Boolean(config.hasPageToken && config.pageId), ok: mode.metaReady && !halt.halted },
      instagram: { connected: Boolean(config.hasPageToken && config.igUserId), ok: mode.metaReady && !halt.halted },
      tiktok: { mode: mode.tiktokMode },
      halted: halt.halted,
      haltReason: halt.reason || "",
      nextPostIn,
      nextPostAt: next?.scheduledAt || null,
      nextPostTitle: next?.headline || next?.title || "",
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
