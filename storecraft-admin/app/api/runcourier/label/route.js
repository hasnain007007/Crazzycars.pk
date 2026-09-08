import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Order from "@/lib/models/Order.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { fetchRunCourierLabel } from "@/lib/runcourier";
import { prepareRunCourierInvoiceHtml } from "@/lib/runcourierInvoice";
import { buildRunCourierAirbillPdf } from "@/lib/runcourierLabelPdf";

export const dynamic = "force-dynamic";

function parseListParam(searchParams, keys) {
  const out = [];
  for (const key of keys) {
    const raw = searchParams.get(key);
    if (raw) {
      for (const part of String(raw).split(",")) {
        const v = part.trim();
        if (v) out.push(v);
      }
    }
    for (const v of searchParams.getAll(key)) {
      const s = String(v || "").trim();
      if (s && !s.includes(",")) out.push(s);
    }
  }
  return [...new Set(out)];
}

function isHttpUrl(v) {
  return /^https?:\/\//i.test(String(v || "").trim());
}

function pdfResponse(buf, tn) {
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="runcourier-airbill-${tn || "shipment"}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let trackingNumbers = parseListParam(searchParams, [
      "trackingNumbers",
      "trackingNumber",
      "tn",
    ]);
    const orderIds = parseListParam(searchParams, ["orderIds", "orderId"]);
    const download = searchParams.get("download") === "1";
    const format = String(searchParams.get("format") || "").toLowerCase();
    const wantPdf = download || format === "pdf" || !format || format === "html";

    await dbConnect();
    const settings =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
      (await Settings.findOne({}).lean()) ||
      {};

    let storedLabel = "";
    if (orderIds.length) {
      const orders = await Order.find({ _id: { $in: orderIds } })
        .select("trackingNumber tracking runCourierLabel")
        .lean();
      for (const order of orders) {
        const tn = String(order.trackingNumber || order.tracking?.number || "").trim();
        if (tn) trackingNumbers.push(tn);
        if (!storedLabel && order.runCourierLabel) {
          storedLabel = String(order.runCourierLabel).trim();
        }
      }
      trackingNumbers = [...new Set(trackingNumbers.filter(Boolean))];
    }

    if (!trackingNumbers.length && !storedLabel) {
      return NextResponse.json(
        { success: false, error: "Tracking number required." },
        { status: 400 }
      );
    }

    const tn = trackingNumbers[0] || "shipment";

    let invoiceLink = isHttpUrl(storedLabel) ? storedLabel : "";
    let labelBase64 = isHttpUrl(storedLabel) ? "" : storedLabel;

    if (!invoiceLink) {
      const fetched = await fetchRunCourierLabel(tn, {
        settingsCourier: settings.courier,
        invoiceLink: "",
      });
      if (fetched.success && fetched.invoiceLink) invoiceLink = fetched.invoiceLink;
      if (fetched.success && fetched.label) labelBase64 = fetched.label;
    }

    if (!invoiceLink && !labelBase64 && orderIds.length === 1) {
      const order = await Order.findById(orderIds[0]).select("runCourierLabel").lean();
      const raw = String(order?.runCourierLabel || "").trim();
      if (isHttpUrl(raw)) invoiceLink = raw;
      else if (raw) labelBase64 = raw;
    }

    // Rare: stored PDF base64
    if (labelBase64 && !isHttpUrl(labelBase64)) {
      const buf = Buffer.from(
        String(labelBase64).replace(/^data:application\/pdf;base64,/, ""),
        "base64"
      );
      if (download || format === "pdf" || !format) return pdfResponse(buf, tn);
      return NextResponse.json({ success: true, label: labelBase64, trackingNumber: tn });
    }

    if (!invoiceLink) {
      return NextResponse.json(
        {
          success: false,
          error: "Airbill not available yet. Book with Run Courier first.",
        },
        { status: 404 }
      );
    }

    // Default: build a real PDF server-side (portal HTML → blank via html2canvas).
    if (wantPdf && format !== "html") {
      const built = await buildRunCourierAirbillPdf(invoiceLink);
      if (!built.success || !built.pdf?.length) {
        return NextResponse.json(
          { success: false, error: built.error || "Could not build airbill PDF." },
          { status: 502 }
        );
      }
      return pdfResponse(built.pdf, built.trackingNumber || tn);
    }

    // Optional HTML for debugging / legacy clients
    const prepared = await prepareRunCourierInvoiceHtml(invoiceLink);
    if (!prepared.success) {
      return NextResponse.json(
        { success: false, error: prepared.error || "Could not load airbill." },
        { status: 502 }
      );
    }
    return NextResponse.json({
      success: true,
      html: prepared.html,
      invoiceLink: prepared.invoiceLink || invoiceLink,
      trackingNumber: tn,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Label fetch failed." },
      { status: 500 }
    );
  }
}
