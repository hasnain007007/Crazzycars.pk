/**
 * GET /api/finance/settlements/[id]
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import CourierSettlementBatch from "@/lib/models/CourierSettlementBatch.model";
import CourierSettlementLine from "@/lib/models/CourierSettlementLine.model";

export async function GET(request, { params }) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canViewFinancials");
    if (denied) return denied;

    await dbConnect();
    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    }

    const batch = await CourierSettlementBatch.findById(id).lean();
    if (!batch) {
      return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    }

    const lines = await CourierSettlementLine.find({ batchId: batch._id })
      .sort({ status: 1, trackingNumber: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      batch: {
        id: String(batch._id),
        cprNumber: batch.cprNumber,
        cprDate: batch.cprDate,
        courier: batch.courier,
        filename: batch.filename,
        status: batch.status,
        deliveredCount: batch.deliveredCount,
        returnedCount: batch.returnedCount,
        codTotal: batch.codTotal,
        shippingCharges: batch.shippingCharges,
        gst: batch.gst,
        deduction4pct: batch.deduction4pct,
        netTotal: batch.netTotal,
        lineCount: batch.lineCount,
        matchedCount: batch.matchedCount,
        unmatchedCount: batch.unmatchedCount,
        productCogsTotal: batch.productCogsTotal || 0,
        profitTotal: batch.profitTotal || 0,
        uploadedBy: batch.uploadedBy,
        postedAt: batch.postedAt,
        postedBy: batch.postedBy,
        createdAt: batch.createdAt,
      },
      lines: lines.map((l) => ({
        id: String(l._id),
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
        orderId: l.orderId ? String(l.orderId) : null,
        orderNumber: l.orderNumber,
        matchStatus: l.matchStatus,
        productCogs: l.productCogs,
        lineProfit: l.lineProfit,
        returnReceivedStatus: l.returnReceivedStatus || "pending",
        returnReceivedAt: l.returnReceivedAt || null,
        returnReceivedBy: l.returnReceivedBy || "",
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Load failed." },
      { status: 500 }
    );
  }
}
