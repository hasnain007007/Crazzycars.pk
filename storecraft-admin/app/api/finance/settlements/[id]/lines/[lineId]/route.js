/**
 * PATCH /api/finance/settlements/[id]/lines/[lineId]
 * Body: { orderId } | { matchStatus: "ignored" | "unmatched" }
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import CourierSettlementBatch from "@/lib/models/CourierSettlementBatch.model";
import CourierSettlementLine from "@/lib/models/CourierSettlementLine.model";
import Order from "@/lib/models/Order.model";
import { computeOrderCogs } from "@/lib/matchSettlementLine";

async function refreshBatchCounts(batchId) {
  const lines = await CourierSettlementLine.find({ batchId }).select("matchStatus").lean();
  const matchedCount = lines.filter(
    (l) => l.matchStatus === "matched" || l.matchStatus === "manual"
  ).length;
  const unmatchedCount = lines.filter((l) => l.matchStatus === "unmatched").length;
  await CourierSettlementBatch.updateOne(
    { _id: batchId },
    { $set: { matchedCount, unmatchedCount, lineCount: lines.length } }
  );
}

export async function PATCH(request, { params }) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canViewFinancials");
    if (denied) return denied;

    await dbConnect();
    const { id, lineId } = await params;
    if (
      !id ||
      !lineId ||
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(lineId)
    ) {
      return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    }

    const batch = await CourierSettlementBatch.findById(id);
    if (!batch) {
      return NextResponse.json({ success: false, error: "Batch not found." }, { status: 404 });
    }
    if (batch.status === "posted") {
      return NextResponse.json(
        { success: false, error: "Posted batches cannot be edited. Void first if needed." },
        { status: 400 }
      );
    }

    const line = await CourierSettlementLine.findOne({ _id: lineId, batchId: batch._id });
    if (!line) {
      return NextResponse.json({ success: false, error: "Line not found." }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));

    if (body.matchStatus === "ignored") {
      line.matchStatus = "ignored";
      line.orderId = null;
      line.orderNumber = "";
      line.productCogs = 0;
      line.lineProfit = 0;
    } else if (body.matchStatus === "unmatched") {
      line.matchStatus = "unmatched";
      line.orderId = null;
      line.orderNumber = "";
      line.productCogs = 0;
      line.lineProfit = 0;
    } else if (body.orderId) {
      if (!mongoose.Types.ObjectId.isValid(body.orderId)) {
        return NextResponse.json({ success: false, error: "Invalid order id." }, { status: 400 });
      }
      const order = await Order.findById(body.orderId)
        .select("orderNumber items.productId items.quantity items.unitCost")
        .lean();
      if (!order) {
        return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
      }
      const productCogs = await computeOrderCogs(order);
      const net = Number(line.netAmount) || 0;
      line.orderId = order._id;
      line.orderNumber = order.orderNumber || "";
      line.matchStatus = "manual";
      line.productCogs = productCogs;
      line.lineProfit =
        line.status === "Delivered" ? Math.round((net - productCogs) * 100) / 100 : 0;
    } else {
      return NextResponse.json(
        { success: false, error: "Provide orderId or matchStatus." },
        { status: 400 }
      );
    }

    await line.save();
    await refreshBatchCounts(batch._id);

    return NextResponse.json({
      success: true,
      line: {
        id: String(line._id),
        matchStatus: line.matchStatus,
        orderId: line.orderId ? String(line.orderId) : null,
        orderNumber: line.orderNumber,
        productCogs: line.productCogs,
        lineProfit: line.lineProfit,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Update failed." },
      { status: 500 }
    );
  }
}
