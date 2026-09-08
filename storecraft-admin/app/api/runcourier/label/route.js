import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Order from "@/lib/models/Order.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { fetchRunCourierLabel } from "@/lib/runcourier";

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

    // Portal invoice / airbill URL saved at booking time.
    if (storedLabel.startsWith("http")) {
      return NextResponse.redirect(storedLabel, 302);
    }

    let labelBase64 = "";
    const fetched = await fetchRunCourierLabel(tn, {
      settingsCourier: settings.courier,
      invoiceLink: storedLabel.startsWith("http") ? storedLabel : "",
    });
    if (fetched.success && fetched.invoiceLink) {
      return NextResponse.redirect(fetched.invoiceLink, 302);
    }
    if (fetched.success) labelBase64 = fetched.label;

    if (!labelBase64 && orderIds.length === 1) {
      const order = await Order.findById(orderIds[0]).select("runCourierLabel").lean();
      const raw = String(order?.runCourierLabel || "").trim();
      if (raw.startsWith("http")) return NextResponse.redirect(raw, 302);
      labelBase64 = raw;
    }

    if (!labelBase64) {
      return NextResponse.json(
        {
          success: false,
          error: "Airbill not available yet. Open the Run Courier invoice from the portal.",
        },
        { status: 404 }
      );
    }

    if (labelBase64.startsWith("http")) {
      return NextResponse.redirect(labelBase64, 302);
    }

    const buf = Buffer.from(labelBase64.replace(/^data:application\/pdf;base64,/, ""), "base64");
    if (download) {
      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="runcourier-${tn}.pdf"`,
        },
      });
    }

    return NextResponse.json({ success: true, label: labelBase64, trackingNumber: tn });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Label fetch failed." },
      { status: 500 }
    );
  }
}
