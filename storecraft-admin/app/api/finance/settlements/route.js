/**
 * GET /api/finance/settlements — list CPR batches
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import CourierSettlementBatch from "@/lib/models/CourierSettlementBatch.model";

export async function GET(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canViewFinancials");
    if (denied) return denied;

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 40));

    const batches = await CourierSettlementBatch.find({})
      .sort({ cprDate: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      batches: batches.map((b) => ({
        id: String(b._id),
        cprNumber: b.cprNumber,
        cprDate: b.cprDate,
        courier: b.courier,
        filename: b.filename,
        status: b.status,
        deliveredCount: b.deliveredCount,
        returnedCount: b.returnedCount,
        codTotal: b.codTotal,
        shippingCharges: b.shippingCharges,
        gst: b.gst,
        deduction4pct: b.deduction4pct,
        netTotal: b.netTotal,
        lineCount: b.lineCount,
        matchedCount: b.matchedCount,
        unmatchedCount: b.unmatchedCount,
        uploadedBy: b.uploadedBy,
        postedAt: b.postedAt,
        createdAt: b.createdAt,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "List failed." },
      { status: 500 }
    );
  }
}
