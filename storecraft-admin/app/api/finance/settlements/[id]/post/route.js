/**
 * POST /api/finance/settlements/[id]/post
 * Write settlement onto matched Delivered orders; mark COD as paid.
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
import Order from "@/lib/models/Order.model";

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
      return NextResponse.json({ success: false, error: "Batch not found." }, { status: 404 });
    }
    if (batch.status === "posted") {
      return NextResponse.json({ success: false, error: "Already posted." }, { status: 400 });
    }
    if (batch.status === "void") {
      return NextResponse.json({ success: false, error: "Batch is void." }, { status: 400 });
    }

    const lines = await CourierSettlementLine.find({
      batchId: batch._id,
      matchStatus: { $in: ["matched", "manual"] },
      orderId: { $ne: null },
    });

    const adminName = user?.name || user?.email || "Admin";
    const now = new Date();
    let updated = 0;
    let markedPaid = 0;

    for (const line of lines) {
      const order = await Order.findById(line.orderId);
      if (!order) continue;

      order.courierSettlement = {
        batchId: batch._id,
        cprNumber: batch.cprNumber,
        trackingNumber: line.trackingNumber,
        codCollected: line.codAmount,
        shippingCharges: line.shippingCharges,
        gst: line.gst,
        deduction4pct: line.deduction4pct,
        netReceived: line.netAmount,
        productCogs: line.productCogs,
        lineProfit: line.lineProfit,
        sheetStatus: line.status,
        postedAt: now,
      };
      order.markModified("courierSettlement");

      if (line.status === "Delivered") {
        const prev = String(order.paymentStatus || "").toLowerCase();
        if (prev !== "paid") {
          order.paymentStatus = "paid";
          if (!order.payment || typeof order.payment !== "object") order.payment = {};
          const total = Number(order.pricing?.total) || Number(line.codAmount) || 0;
          order.payment.paidAmount = total;
          order.payment.remainingCod = 0;
          order.payment.amount = total;
          order.payment.paidAt = order.payment.paidAt || now;
          order.payment.transactionId = batch.cprNumber;
          order.paymentConfirmation = {
            reference: batch.cprNumber,
            confirmedBy: adminName,
            confirmedAt: now,
          };
          order.markModified("payment");
          order.markModified("paymentConfirmation");
          markedPaid += 1;
        }
      }

      await order.save();
      updated += 1;
    }

    batch.status = "posted";
    batch.postedAt = now;
    batch.postedBy = adminName;
    await batch.save();

    await logActivity({
      user: user?.id || user?._id,
      userName: adminName,
      action: "finance.cpr_post",
      resource: "CourierSettlementBatch",
      resourceId: String(batch._id),
      details: { cprNumber: batch.cprNumber, updated, markedPaid },
      type: "update",
      ip: requestIp(request),
    });

    return NextResponse.json({
      success: true,
      updated,
      markedPaid,
      batchId: String(batch._id),
      status: batch.status,
    });
  } catch (e) {
    console.error("CPR post failed:", e);
    return NextResponse.json(
      { success: false, error: e.message || "Post failed." },
      { status: 500 }
    );
  }
}
