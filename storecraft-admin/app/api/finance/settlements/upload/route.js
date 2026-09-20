/**
 * POST /api/finance/settlements/upload
 * Accepts PostEx CPR PDFs, CPR_Transactions CSV/Excel, Run Courier sheets, screenshots.
 * Multiple CPR PDFs → one settlement batch each.
 * Spreadsheet ORDER_REF / Order ID merges onto CPR PDF lines by tracking (CSV alone still creates a batch).
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import { logActivity } from "@/lib/auth";
import { requestIp } from "@/lib/requestIp";
import CourierSettlementBatch from "@/lib/models/CourierSettlementBatch.model";
import CourierSettlementLine from "@/lib/models/CourierSettlementLine.model";
import { parseCourierRemittance } from "@/lib/parseCourierRemittance";
import {
  buildOrderRefMapFromLines,
  computeSettlementProfitTotals,
  enrichLinesWithMatches,
  mergeOrderRefsByTracking,
} from "@/lib/matchSettlementLine";
import { isRemittanceImage } from "@/lib/extractScreenshotText";
import { isRemittanceSpreadsheet } from "@/lib/parseRemittanceSpreadsheet";

export const runtime = "nodejs";
export const maxDuration = 180;

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

function isSpreadsheetMeta(meta) {
  return isRemittanceSpreadsheet(meta);
}

function isPostexTxnSheet(parsed, meta) {
  const name = String(meta.filename || "").toLowerCase();
  if (/cpr[_-]?transactions/i.test(name)) return true;
  if (parsed?.source === "excel" && /POSTEX-TXN/i.test(String(parsed.cprNumber || ""))) {
    return true;
  }
  return false;
}

async function createBatchFromParsed(parsed, { filename, adminName, user, ip }) {
  const existing = await CourierSettlementBatch.findOne({ cprNumber: parsed.cprNumber }).lean();
  if (existing) {
    return {
      ok: false,
      conflict: true,
      cprNumber: parsed.cprNumber,
      batchId: String(existing._id),
      error: `Sheet ${parsed.cprNumber} was already uploaded.`,
    };
  }

  const enriched = await enrichLinesWithMatches(parsed.lines || []);
  const matchedCount = enriched.filter(
    (l) => l.matchStatus === "matched" || l.matchStatus === "manual"
  ).length;
  const unmatchedCount = enriched.filter((l) => l.matchStatus === "unmatched").length;
  const { productCogsTotal, returnFeesTotal, profitTotal } = computeSettlementProfitTotals(
    enriched,
    parsed.netTotal
  );

  const batch = await CourierSettlementBatch.create({
    cprNumber: parsed.cprNumber,
    cprDate: parsed.cprDate,
    courier: parsed.courier || "PostEx",
    filename: String(filename || "").slice(0, 200),
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
    productCogsTotal,
    returnFeesTotal,
    profitTotal,
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
      source: parsed.source || "pdf",
      lines: enriched.length,
      matched: matchedCount,
      profitTotal,
    },
    type: "create",
    ip,
  });

  return {
    ok: true,
    batchId: String(batch._id),
    cprNumber: parsed.cprNumber,
    courier: parsed.courier,
    source: parsed.source || "pdf",
    lineCount: enriched.length,
    matchedCount,
    unmatchedCount,
    returnedCount: parsed.returnedCount || enriched.filter((l) => l.status === "Return").length,
    productCogsTotal,
    returnFeesTotal,
    profitTotal,
    netTotal: parsed.netTotal,
  };
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
        {
          success: false,
          error: "Missing file. Drop PostEx CPR PDF(s), CPR_Transactions CSV, Excel, or screenshots.",
        },
        { status: 400 }
      );
    }

    const files = [];
    for (const file of rawFiles) {
      if (!isAllowedUpload(file)) {
        return NextResponse.json(
          {
            success: false,
            error: `Unsupported file “${file.name || "upload"}”. Use PostEx CPR PDF, CPR_Transactions CSV/Excel, or PNG/JPG.`,
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

    const adminName = user?.name || user?.email || "Admin";
    const ip = requestIp(request);

    // Parse all first so CSV ORDER_REF can enrich CPR PDF lines
    const parsedFiles = [];
    const parseErrors = [];
    for (const f of files) {
      try {
        const parsed = await parseCourierRemittance(f.buffer, f);
        parsedFiles.push({ ...f, parsed });
      } catch (err) {
        parseErrors.push({
          ok: false,
          filename: f.filename,
          error: err.message || "Parse failed",
        });
      }
    }

    const sheetParts = parsedFiles.filter((p) => isSpreadsheetMeta(p));
    const otherParts = parsedFiles.filter((p) => !isSpreadsheetMeta(p));
    const hasNonSheet = otherParts.length > 0;

    const refMap = new Map();
    for (const part of sheetParts) {
      for (const [k, v] of buildOrderRefMapFromLines(part.parsed.lines || [])) {
        if (!refMap.has(k)) refMap.set(k, v);
      }
    }

    const results = [];
    const errors = [...parseErrors];

    // Non-spreadsheet (CPR PDFs / screenshots): merge refs then create batches
    for (const part of otherParts) {
      try {
        const lines = mergeOrderRefsByTracking(part.parsed.lines || [], refMap);
        const created = await createBatchFromParsed(
          { ...part.parsed, lines },
          { filename: part.filename, adminName, user, ip }
        );
        if (created.ok) results.push(created);
        else errors.push(created);
      } catch (err) {
        errors.push({
          ok: false,
          filename: part.filename,
          error: err.message || "Create failed",
        });
      }
    }

    // Spreadsheets: enrich-only when CPR PDFs are present (avoid double-counting CPR_Transactions)
    for (const part of sheetParts) {
      if (hasNonSheet && isPostexTxnSheet(part.parsed, part)) {
        errors.push({
          ok: false,
          filename: part.filename,
          skipped: true,
          error: `Used “${part.filename}” only to attach ORDER_REF to CPR PDF lines (not a separate settlement).`,
        });
        continue;
      }
      try {
        const created = await createBatchFromParsed(part.parsed, {
          filename: part.filename,
          adminName,
          user,
          ip,
        });
        if (created.ok) results.push(created);
        else errors.push(created);
      } catch (err) {
        errors.push({
          ok: false,
          filename: part.filename,
          error: err.message || "Create failed",
        });
      }
    }

    if (!results.length) {
      const first = errors.find((e) => !e.skipped) || errors[0];
      return NextResponse.json(
        {
          success: false,
          error: first?.error || "Could not parse remittance upload.",
          errors,
        },
        { status: first?.conflict ? 409 : 400 }
      );
    }

    const totalMatched = results.reduce((s, r) => s + (r.matchedCount || 0), 0);
    const totalLines = results.reduce((s, r) => s + (r.lineCount || 0), 0);

    return NextResponse.json({
      success: true,
      batchId: results[0].batchId,
      batchIds: results.map((r) => r.batchId),
      cprNumber: results[0].cprNumber,
      batches: results,
      errors: errors.length ? errors : undefined,
      lineCount: totalLines,
      matchedCount: totalMatched,
      unmatchedCount: results.reduce((s, r) => s + (r.unmatchedCount || 0), 0),
      netTotal: results.reduce((s, r) => s + (Number(r.netTotal) || 0), 0),
      productCogsTotal: results.reduce((s, r) => s + (Number(r.productCogsTotal) || 0), 0),
      returnFeesTotal: results.reduce((s, r) => s + (Number(r.returnFeesTotal) || 0), 0),
      profitTotal: results.reduce((s, r) => s + (Number(r.profitTotal) || 0), 0),
      source: results[0].source,
      courier: results[0].courier,
      count: results.length,
    });
  } catch (e) {
    console.error("CPR upload failed:", e);
    return NextResponse.json(
      { success: false, error: e.message || "Upload failed." },
      { status: 500 }
    );
  }
}
