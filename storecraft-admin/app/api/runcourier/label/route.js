import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Order from "@/lib/models/Order.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { fetchRunCourierLabel } from "@/lib/runcourier";
import { prepareRunCourierInvoiceHtml } from "@/lib/runcourierInvoice";
import {
  buildRunCourierAirbillPdf,
  buildRunCourierAirbillsPdf,
} from "@/lib/runcourierLabelPdf";

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

    /** @type {Array<{ id: string, trackingNumber: string, orderNumber: string, invoiceLink: string }>} */
    const labelJobs = [];

    if (orderIds.length) {
      const orders = await Order.find({ _id: { $in: orderIds } })
        .select("trackingNumber tracking runCourierLabel orderNumber")
        .lean();
      for (const order of orders) {
        const tn = String(order.trackingNumber || order.tracking?.number || "").trim();
        if (tn) trackingNumbers.push(tn);
        const link = String(order.runCourierLabel || "").trim();
        if (isHttpUrl(link) || tn) {
          labelJobs.push({
            id: String(order._id),
            trackingNumber: tn,
            orderNumber: String(order.orderNumber || "").trim(),
            invoiceLink: isHttpUrl(link) ? link : "",
          });
        }
      }
      trackingNumbers = [...new Set(trackingNumbers.filter(Boolean))];
    }

    if (!trackingNumbers.length && !labelJobs.length) {
      return NextResponse.json(
        { success: false, error: "Tracking number required." },
        { status: 400 }
      );
    }

    // Resolve invoice links for jobs missing them / tracking-only requests
    if (!labelJobs.length && trackingNumbers.length) {
      for (const tn of trackingNumbers) {
        const order = await Order.findOne({
          $or: [{ trackingNumber: tn }, { "tracking.number": tn }],
        })
          .select("trackingNumber tracking runCourierLabel orderNumber")
          .lean();
        labelJobs.push({
          id: order ? String(order._id) : "",
          trackingNumber: tn,
          orderNumber: String(order?.orderNumber || "").trim(),
          invoiceLink: isHttpUrl(order?.runCourierLabel) ? String(order.runCourierLabel) : "",
        });
      }
    }

    for (const job of labelJobs) {
      if (job.invoiceLink) continue;
      if (!job.trackingNumber) continue;
      const fetched = await fetchRunCourierLabel(job.trackingNumber, {
        settingsCourier: settings.courier,
        invoiceLink: "",
      });
      if (fetched.success && fetched.invoiceLink) {
        job.invoiceLink = fetched.invoiceLink;
      }
    }

    const ready = labelJobs.filter((j) => isHttpUrl(j.invoiceLink));
    const tn = ready[0]?.trackingNumber || trackingNumbers[0] || "shipment";

    if (!ready.length) {
      // Last chance: single stored non-http label (legacy PDF base64)
      if (orderIds.length === 1) {
        const order = await Order.findById(orderIds[0])
          .select("runCourierLabel orderNumber trackingNumber")
          .lean();
        const raw = String(order?.runCourierLabel || "").trim();
        if (raw && !isHttpUrl(raw)) {
          const buf = Buffer.from(
            raw.replace(/^data:application\/pdf;base64,/, ""),
            "base64"
          );
          if (download || format === "pdf" || !format) {
            return pdfResponse(buf, order?.trackingNumber || tn);
          }
        }
      }
      return NextResponse.json(
        {
          success: false,
          error: "Airbill not available yet. Book with Run Courier first.",
        },
        { status: 404 }
      );
    }

    if (wantPdf && format !== "html") {
      if (ready.length === 1) {
        const built = await buildRunCourierAirbillPdf(ready[0].invoiceLink, {
          orderNumber: ready[0].orderNumber,
        });
        if (!built.success || !built.pdf?.length) {
          return NextResponse.json(
            { success: false, error: built.error || "Could not build airbill PDF." },
            { status: 502 }
          );
        }
        return pdfResponse(
          built.pdf,
          built.trackingNumber || ready[0].trackingNumber || tn
        );
      }

      // Batch: 2 compact airbills per A4 page
      const built = await buildRunCourierAirbillsPdf(
        ready.map((j) => ({
          invoiceLink: j.invoiceLink,
          orderNumber: j.orderNumber,
        }))
      );
      if (!built.success || !built.pdf?.length) {
        return NextResponse.json(
          { success: false, error: built.error || "Could not build airbill PDF." },
          { status: 502 }
        );
      }
      return pdfResponse(built.pdf, `batch-${ready.length}`);
    }

    const prepared = await prepareRunCourierInvoiceHtml(ready[0].invoiceLink);
    if (!prepared.success) {
      return NextResponse.json(
        { success: false, error: prepared.error || "Could not load airbill." },
        { status: 502 }
      );
    }
    return NextResponse.json({
      success: true,
      html: prepared.html,
      invoiceLink: prepared.invoiceLink || ready[0].invoiceLink,
      trackingNumber: ready[0].trackingNumber || tn,
      orderNumber: ready[0].orderNumber || "",
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Label fetch failed." },
      { status: 500 }
    );
  }
}
