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

    const ids = batches.map((b) => b._id);
    let pendingByBatch = new Map();
    if (ids.length) {
      const CourierSettlementLine = (await import("@/lib/models/CourierSettlementLine.model"))
        .default;
      const pending = await CourierSettlementLine.aggregate([
        {
          $match: {
            batchId: { $in: ids },
            status: "Return",
            $or: [
              { returnReceivedStatus: "pending" },
              { returnReceivedStatus: { $exists: false } },
              { returnReceivedStatus: null },
              { returnReceivedStatus: "" },
            ],
          },
        },
        { $group: { _id: "$batchId", n: { $sum: 1 } } },
      ]);
      pendingByBatch = new Map(pending.map((p) => [String(p._id), p.n]));
    }

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
        returnsPending: pendingByBatch.get(String(b._id)) || 0,
        codTotal: b.codTotal,
        shippingCharges: b.shippingCharges,
        gst: b.gst,
        deduction4pct: b.deduction4pct,
        netTotal: b.netTotal,
        lineCount: b.lineCount,
        matchedCount: b.matchedCount,
        unmatchedCount: b.unmatchedCount,
        productCogsTotal: b.productCogsTotal || 0,
        returnFeesTotal: b.returnFeesTotal || 0,
        profitTotal: b.profitTotal || 0,
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
