/**
 * DELETE /api/social/import/batch/[batchId] — undo unposted posts from import
 * GET — list recent import batches
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessAnyCapability } from "@/lib/denyCapability";
import ImportBatch from "@/lib/models/ImportBatch.model";
import { undoImportBatch } from "@/lib/social/commitImport";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessAnyCapability(user, ["canManageContent", "canManageSettings"]);
    if (denied) return denied;
    await dbConnect();
    const rows = await ImportBatch.find().sort({ createdAt: -1 }).limit(30).lean();
    return NextResponse.json({
      success: true,
      batches: rows.map((b) => ({
        id: String(b._id),
        fileName: b.fileName,
        rows: b.rows,
        created: (b.createdPostIds || []).length,
        errors: b.errors || [],
        weekStart: b.weekStart,
        undoneAt: b.undoneAt,
        createdAt: b.createdAt,
      })),
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed" }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessAnyCapability(user, ["canManageContent", "canManageSettings"]);
    if (denied) return denied;
    const { batchId } = await context.params;
    await dbConnect();
    const result = await undoImportBatch(batchId);
    return NextResponse.json({
      success: true,
      ...result,
      message: `Removed ${result.deleted} unposted posts. ${result.kept} already posted were kept.`,
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Undo failed" }, { status: 400 });
  }
}
