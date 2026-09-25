/**
 * POST /api/social/import/[importId]/commit — create scheduled posts from preview
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessAnyCapability } from "@/lib/denyCapability";
import { commitImport } from "@/lib/social/commitImport";
import { formatPktLabel } from "@/lib/social/pktTime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request, context) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessAnyCapability(user, ["canManageContent", "canManageSettings"]);
    if (denied) return denied;
    const { importId } = await context.params;
    await dbConnect();
    const userId = user.userId || user.id || user._id || null;
    const result = await commitImport(importId, { userId });
    const firstLabel = result.firstScheduledAt
      ? formatPktLabel(result.firstScheduledAt)
      : "";
    return NextResponse.json({
      success: true,
      ...result,
      message: `✅ ${result.created} posts scheduled.${firstLabel ? ` First post: ${firstLabel}` : ""}`,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Could not schedule week" },
      { status: 500 }
    );
  }
}
