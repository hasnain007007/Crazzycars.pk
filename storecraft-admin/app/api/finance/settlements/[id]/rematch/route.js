/**
 * POST /api/finance/settlements/[id]/rematch
 * Re-match draft settlement lines to orders (tracking + order #).
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import { logActivity } from "@/lib/auth";
import { requestIp } from "@/lib/requestIp";
import CourierSettlementBatch from "@/lib/models/CourierSettlementBatch.model";
import CourierSettlementLine from "@/lib/models/CourierSettlementLine.model";
import { enrichLinesWithMatches } from "@/lib/matchSettlementLine";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request, { params }) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canViewFinancials");
    if (denied) return denied;

    await dbConnect();
    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    }

    const batch = await CourierSettlementBatch.findById(id);
    if (!batch) {
      return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    }
    if (batch.status !== "draft") {
      return NextResponse.json(
        { success: false, error: "Only draft settlements can be re-matched." },
        { status: 400 }
      );
    }

    const existing = await CourierSettlementLine.find({ batchId: batch._id }).lean();
    if (!existing.length) {
      return NextResponse.json({ success: false, error: "No lines to match." }, { status: 400 });
    }

    const enriched = await enrichLinesWithMatches(
      existing.map((l) => ({
        trackingNumber: l.trackingNumber,
        status: l.status,
        codAmount: l.codAmount,
        shippingCharges: l.shippingCharges,
        gst: l.gst,
        deduction4pct: l.deduction4pct,
        netAmount: l.netAmount,
        originCity: l.originCity,
        destinationCity: l.destinationCity,
        weightKg: l.weightKg,
        bookingDate: l.bookingDate,
        deliveryReturnDate: l.deliveryReturnDate,
        orderNumberHint: l.orderNumber || "",
        sheetOrderNumber: l.orderNumber || "",
        returnReceivedStatus: l.returnReceivedStatus,
      }))
    );

    let matchedCount = 0;
    let unmatchedCount = 0;
    for (let i = 0; i < existing.length; i++) {
      const prev = existing[i];
      const next = enriched[i];
      if (!next) continue;

      // Keep manual links / ignored
      if (prev.matchStatus === "manual" || prev.matchStatus === "ignored") {
        if (prev.matchStatus === "manual" || prev.matchStatus === "matched") matchedCount += 1;
        else if (prev.matchStatus === "unmatched") unmatchedCount += 1;
        continue;
      }

      const update = {
        matchStatus: next.matchStatus,
        orderId: next.orderId || null,
        orderNumber: next.orderNumber || prev.orderNumber || "",
        productCogs: next.productCogs || 0,
        lineProfit: next.lineProfit || 0,
      };
      await CourierSettlementLine.updateOne({ _id: prev._id }, { $set: update });
      if (next.matchStatus === "matched") matchedCount += 1;
      else if (next.matchStatus === "unmatched") unmatchedCount += 1;
    }

    // Recount including manual/ignored
    const all = await CourierSettlementLine.find({ batchId: batch._id })
      .select("matchStatus status returnReceivedStatus")
      .lean();
    matchedCount = all.filter((l) => l.matchStatus === "matched" || l.matchStatus === "manual").length;
    unmatchedCount = all.filter((l) => l.matchStatus === "unmatched").length;
    const returnsPending = all.filter(
      (l) => l.status === "Return" && (l.returnReceivedStatus || "pending") === "pending"
    ).length;

    batch.matchedCount = matchedCount;
    batch.unmatchedCount = unmatchedCount;
    batch.lineCount = all.length;

    const profitAgg = await CourierSettlementLine.aggregate([
      {
        $match: {
          batchId: batch._id,
          status: "Delivered",
          matchStatus: { $in: ["matched", "manual"] },
        },
      },
      {
        $group: {
          _id: null,
          productCogsTotal: { $sum: "$productCogs" },
          profitTotal: { $sum: "$lineProfit" },
        },
      },
    ]);
    batch.productCogsTotal =
      Math.round((Number(profitAgg[0]?.productCogsTotal) || 0) * 100) / 100;
    batch.profitTotal = Math.round((Number(profitAgg[0]?.profitTotal) || 0) * 100) / 100;
    await batch.save();

    const adminName = user?.name || user?.email || "Admin";
    await logActivity({
      user: user?.id || user?._id,
      userName: adminName,
      action: "finance.cpr_rematch",
      resource: "CourierSettlementBatch",
      resourceId: String(batch._id),
      details: {
        matchedCount,
        unmatchedCount,
        returnsPending,
        profitTotal: batch.profitTotal,
      },
      type: "update",
      ip: requestIp(request),
    });

    return NextResponse.json({
      success: true,
      matchedCount,
      unmatchedCount,
      lineCount: all.length,
      returnsPending,
      productCogsTotal: batch.productCogsTotal,
      profitTotal: batch.profitTotal,
    });
  } catch (e) {
    console.error("Settlement rematch failed:", e);
    return NextResponse.json(
      { success: false, error: e.message || "Rematch failed." },
      { status: 500 }
    );
  }
}
