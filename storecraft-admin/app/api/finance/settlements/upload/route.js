/**
 * POST /api/finance/settlements/upload — PostEx CPR PDF → draft batch + matched lines
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import { logActivity } from "@/lib/auth";
import { requestIp } from "@/lib/requestIp";
import CourierSettlementBatch from "@/lib/models/CourierSettlementBatch.model";
import CourierSettlementLine from "@/lib/models/CourierSettlementLine.model";
import { parseCourierRemittancePdf } from "@/lib/parseCourierRemittance";
import { enrichLinesWithMatches } from "@/lib/matchSettlementLine";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canViewFinancials");
    if (denied) return denied;

    await dbConnect();
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ success: false, error: "Missing PDF file." }, { status: 400 });
    }

    const name = String(file.name || "remittance.pdf");
    if (!/\.pdf$/i.test(name) && file.type !== "application/pdf") {
      return NextResponse.json(
        { success: false, error: "Upload a courier remittance PDF (PostEx CPR or Run Courier)." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!buffer.length) {
      return NextResponse.json({ success: false, error: "Empty file." }, { status: 400 });
    }
    if (buffer.length > 15 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "PDF too large (max 15MB)." }, { status: 400 });
    }

    let parsed;
    try {
      parsed = await parseCourierRemittancePdf(buffer);
    } catch (err) {
      return NextResponse.json(
        { success: false, error: err.message || "Could not parse remittance PDF." },
        { status: 400 }
      );
    }

    const existing = await CourierSettlementBatch.findOne({ cprNumber: parsed.cprNumber }).lean();
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: `Sheet ${parsed.cprNumber} was already uploaded.`,
          batchId: String(existing._id),
        },
        { status: 409 }
      );
    }

    const enriched = await enrichLinesWithMatches(parsed.lines);
    const matchedCount = enriched.filter((l) => l.matchStatus === "matched" || l.matchStatus === "manual").length;
    const unmatchedCount = enriched.filter((l) => l.matchStatus === "unmatched").length;

    const adminName = user?.name || user?.email || "Admin";
    const batch = await CourierSettlementBatch.create({
      cprNumber: parsed.cprNumber,
      cprDate: parsed.cprDate,
      courier: parsed.courier || "PostEx",
      filename: name.slice(0, 200),
      deliveredCount: parsed.deliveredCount,
      returnedCount: parsed.returnedCount,
      codTotal: parsed.codTotal,
      shippingCharges: parsed.shippingCharges,
      gst: parsed.gst,
      deduction4pct: parsed.deduction4pct,
      netTotal: parsed.netTotal,
      status: "draft",
      uploadedBy: adminName,
      lineCount: enriched.length,
      matchedCount,
      unmatchedCount,
    });

    if (enriched.length) {
      await CourierSettlementLine.insertMany(
        enriched.map((l) => ({
          batchId: batch._id,
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
          orderId: l.orderId || null,
          orderNumber: l.orderNumber || "",
          matchStatus: l.matchStatus,
          productCogs: l.productCogs,
          lineProfit: l.lineProfit,
          returnReceivedStatus: l.status === "Return" ? "pending" : "pending",
        }))
      );
    }

    await logActivity({
      user: user?.id || user?._id,
      userName: adminName,
      action: "finance.cpr_upload",
      resource: "CourierSettlementBatch",
      resourceId: String(batch._id),
      details: {
        cprNumber: parsed.cprNumber,
        courier: parsed.courier,
        lines: enriched.length,
        matched: matchedCount,
      },
      type: "create",
      ip: requestIp(request),
    });

    return NextResponse.json({
      success: true,
      batchId: String(batch._id),
      cprNumber: parsed.cprNumber,
      courier: parsed.courier,
      lineCount: enriched.length,
      matchedCount,
      unmatchedCount,
      netTotal: parsed.netTotal,
    });
  } catch (e) {
    console.error("CPR upload failed:", e);
    return NextResponse.json(
      { success: false, error: e.message || "Upload failed." },
      { status: 500 }
    );
  }
}
