import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Order from "@/lib/models/Order.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { fetchPostexLabel } from "@/lib/postex";

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

    await dbConnect();
    const settings =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
      (await Settings.findOne({}).lean()) ||
      {};

    // Resolve tracking numbers from order ids when needed.
    if (orderIds.length) {
      const orders = await Order.find({ _id: { $in: orderIds } })
        .select("trackingNumber tracking")
        .lean();
      for (const order of orders) {
        const tn = String(order.trackingNumber || order.tracking?.number || "").trim();
        if (tn) trackingNumbers.push(tn);
      }
      trackingNumbers = [...new Set(trackingNumbers.filter(Boolean))];
    }

    if (!trackingNumbers.length) {
      return NextResponse.json(
        { success: false, error: "Tracking number required." },
        { status: 400 }
      );
    }

    // Always fetch combined PDF from PostEx for 1+ labels (single file).
    // Cached per-order base64 labels cannot be merged cleanly without a PDF library.
    const fetched = await fetchPostexLabel(trackingNumbers, {
      settingsCourier: settings.courier,
    });

    let labelBase64 = fetched.success ? fetched.label : "";

    // Single-order fallback: use stored label if PostEx fetch failed.
    if (!labelBase64 && trackingNumbers.length === 1 && orderIds.length === 1) {
      const order = await Order.findById(orderIds[0]).select("postexLabel").lean();
      labelBase64 = String(order?.postexLabel || "").trim();
    }

    if (!labelBase64) {
      return NextResponse.json(
        {
          success: false,
          error: fetched.error || "Shipping label not available for this order.",
        },
        { status: 404 }
      );
    }

    const raw = labelBase64.replace(/^data:application\/pdf;base64,/, "");
    let buffer;
    try {
      buffer = Buffer.from(raw, "base64");
    } catch {
      return NextResponse.json({ success: false, error: "Invalid label data." }, { status: 500 });
    }

    const download = searchParams.get("download") === "1" || searchParams.get("download") === "true";
    const filename =
      trackingNumbers.length > 1
        ? `postex-labels-${trackingNumbers.length}.pdf`
        : `postex-label-${trackingNumbers[0]}.pdf`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Failed to load label." },
      { status: 500 }
    );
  }
}
