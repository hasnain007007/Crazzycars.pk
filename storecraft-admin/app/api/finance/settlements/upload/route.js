/**
 * POST /api/finance/settlements/upload
 * Accepts PostEx CPR PDF, Run Courier remittance PDF, or screenshot image(s).
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import { logActivity } from "@/lib/auth";
import { requestIp } from "@/lib/requestIp";
import CourierSettlementBatch from "@/lib/models/CourierSettlementBatch.model";
import CourierSettlementLine from "@/lib/models/CourierSettlementLine.model";
import { parseCourierRemittanceFiles } from "@/lib/parseCourierRemittance";
import { enrichLinesWithMatches } from "@/lib/matchSettlementLine";
import { isRemittanceImage } from "@/lib/extractScreenshotText";
import { isRemittanceSpreadsheet } from "@/lib/parseRemittanceSpreadsheet";

export const runtime = "nodejs";
/** OCR / large sheets can take a while */
export const maxDuration = 120;

function collectUploadFiles(formData) {
  const out = [];
  for (const key of ["file", "files", "screenshot", "screenshots", "image", "excel", "sheet"]) {
    for (const entry of formData.getAll(key)) {
      if (!entry || typeof entry === "string") continue;
      out.push(entry);
    }
  }
  return out;
}

function isAllowedUpload(file) {
  const name = String(file.name || "");
  const type = String(file.type || "");
  if (type === "application/pdf" || /\.pdf$/i.test(name)) return true;
  if (isRemittanceImage({ filename: name, mimeType: type })) return true;
  if (isRemittanceSpreadsheet({ filename: name, mimeType: type })) return true;
  return false;
}

export async function POST(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canViewFinancials");
    if (denied) return denied;

    await dbConnect();
    const formData = await request.formData();
    const rawFiles = collectUploadFiles(formData);
    if (!rawFiles.length) {
      return NextResponse.json(
        { success: false, error: "Missing file. Drop a PDF, Excel/CSV, or Run Courier screenshot." },
        { status: 400 }
      );
    }

    const files = [];
    for (const file of rawFiles) {
      if (!isAllowedUpload(file)) {
        return NextResponse.json(
          {
            success: false,
            error: `Unsupported file “${file.name || "upload"}”. Use PDF, Excel (.xlsx/.xls), CSV, PNG, JPG, or WEBP.`,
          },
          { status: 400 }
        );
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      if (!buffer.length) continue;
      if (buffer.length > 20 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: `File too large: ${file.name} (max 20MB).` },
          { status: 400 }
        );
      }
      files.push({
        buffer,
        filename: String(file.name || "remittance").slice(0, 200),
        mimeType: String(file.type || ""),
      });
    }

    if (!files.length) {
      return NextResponse.json({ success: false, error: "Empty file." }, { status: 400 });
    }

    let parsed;
    try {
      parsed = await parseCourierRemittanceFiles(files);
    } catch (err) {
      return NextResponse.json(
        { success: false, error: err.message || "Could not parse remittance upload." },
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
    const matchedCount = enriched.filter(
      (l) => l.matchStatus === "matched" || l.matchStatus === "manual"
    ).length;
    const unmatchedCount = enriched.filter((l) => l.matchStatus === "unmatched").length;

    const adminName = user?.name || user?.email || "Admin";
    const filenameLabel =
      files.length === 1
        ? files[0].filename
        : `${files.length} screenshots (${files.map((f) => f.filename).join(", ")})`.slice(0, 200);

    const batch = await CourierSettlementBatch.create({
      cprNumber: parsed.cprNumber,
      cprDate: parsed.cprDate,
      courier: parsed.courier || "PostEx",
      filename: filenameLabel,
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
          returnReceivedStatus: "pending",
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
        source: parsed.source || "pdf",
        files: files.length,
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
      source: parsed.source || "pdf",
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
