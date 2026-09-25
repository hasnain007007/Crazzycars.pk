/**
 * GET/PUT /api/social/settings
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessAnyCapability } from "@/lib/denyCapability";
import SocialSettings, { DEFAULT_FOOTER } from "@/lib/models/SocialSettings.model";
import { getEffectiveSocialMode } from "@/lib/social/mode";
import ImportBatch from "@/lib/models/ImportBatch.model";

export const dynamic = "force-dynamic";

function serializeSettings(doc, mode) {
  return {
    dryRun: mode.dryRun,
    dbDryRun: doc.dryRun !== false,
    locked: mode.locked,
    lockReason: mode.lockReason,
    defaultSlots: doc.defaultSlots?.length ? doc.defaultSlots : ["10:00", "18:00"],
    defaultPlatforms: doc.defaultPlatforms || {
      facebook: true,
      instagram: true,
      tiktok: false,
    },
    footerText: doc.footerText || DEFAULT_FOOTER,
    alwaysHashtag: doc.alwaysHashtag || "#crazzycarspk",
    hashtagLimits: doc.hashtagLimits || { ig: 30, fb: 5, tiktok: 5 },
    tiktokMode: mode.tiktokMode,
    metaReady: mode.metaReady,
    enabled: mode.enabled,
    timezone: mode.timezone,
  };
}

export async function GET(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessAnyCapability(user, ["canManageContent", "canManageSettings"]);
    if (denied) return denied;
    await dbConnect();
    const doc = await SocialSettings.getOrCreate();
    const mode = await getEffectiveSocialMode();
    const batches = await ImportBatch.find().sort({ createdAt: -1 }).limit(10).lean();
    return NextResponse.json({
      success: true,
      settings: serializeSettings(doc, mode),
      batches: batches.map((b) => ({
        id: String(b._id),
        fileName: b.fileName,
        rows: b.rows,
        created: (b.createdPostIds || []).length,
        undoneAt: b.undoneAt,
        createdAt: b.createdAt,
      })),
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessAnyCapability(user, ["canManageContent", "canManageSettings"]);
    if (denied) return denied;
    await dbConnect();
    const mode = await getEffectiveSocialMode();
    const body = await request.json().catch(() => ({}));
    const doc = await SocialSettings.getOrCreate();

    if (body.dryRun != null) {
      if (mode.locked) {
        return NextResponse.json(
          {
            success: false,
            error: mode.lockReason || "Live/Test is locked by Coolify SOCIAL_DRY_RUN",
          },
          { status: 400 }
        );
      }
      doc.dryRun = Boolean(body.dryRun);
    }
    if (Array.isArray(body.defaultSlots)) {
      doc.defaultSlots = body.defaultSlots.map(String).filter((s) => /^\d{1,2}:\d{2}$/.test(s));
    }
    if (body.defaultPlatforms && typeof body.defaultPlatforms === "object") {
      doc.defaultPlatforms = {
        facebook: body.defaultPlatforms.facebook !== false,
        instagram: body.defaultPlatforms.instagram !== false,
        tiktok: Boolean(body.defaultPlatforms.tiktok),
      };
    }
    if (body.footerText != null) doc.footerText = String(body.footerText);
    if (body.alwaysHashtag != null) {
      let t = String(body.alwaysHashtag).trim();
      if (t && !t.startsWith("#")) t = `#${t}`;
      doc.alwaysHashtag = t || "#crazzycarspk";
    }
    if (body.hashtagLimits && typeof body.hashtagLimits === "object") {
      doc.hashtagLimits = {
        ig: Number(body.hashtagLimits.ig) || 30,
        fb: Number(body.hashtagLimits.fb) || 5,
        tiktok: Number(body.hashtagLimits.tiktok) || 5,
      };
    }
    await doc.save();
    const nextMode = await getEffectiveSocialMode();
    return NextResponse.json({ success: true, settings: serializeSettings(doc, nextMode) });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed" }, { status: 500 });
  }
}
