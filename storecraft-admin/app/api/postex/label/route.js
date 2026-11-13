import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Order from "@/lib/models/Order.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import {
  airbillFieldsFromOrder,
  buildStoreAirbillsPdf,
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

/**
 * CrazzyCars.pk branded airbill PDF for PostEx shipments.
 * We no longer proxy PostEx's own label (PostEx logo + merchant pickup address).
 */
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

    /** @type {Map<string, object>} */
    const byTracking = new Map();
    /** @type {object[]} */
    let orders = [];

    if (orderIds.length) {
      orders = await Order.find({ _id: { $in: orderIds } }).lean();
      for (const order of orders) {
        const tn = String(order.trackingNumber || order.tracking?.number || "").trim();
        if (tn) {
          trackingNumbers.push(tn);
          byTracking.set(tn, order);
        }
      }
      trackingNumbers = [...new Set(trackingNumbers.filter(Boolean))];
    }

    if (!trackingNumbers.length) {
      return NextResponse.json(
        { success: false, error: "Tracking number required." },
        { status: 400 }
      );
    }

    // Load any orders missing from the map (label by tracking only).
    const missing = trackingNumbers.filter((tn) => !byTracking.has(tn));
    if (missing.length) {
      const found = await Order.find({
        $or: [
          { trackingNumber: { $in: missing } },
          { "tracking.number": { $in: missing } },
        ],
      }).lean();
      for (const order of found) {
        const tn = String(order.trackingNumber || order.tracking?.number || "").trim();
        if (tn && !byTracking.has(tn)) byTracking.set(tn, order);
      }
    }

    const items = [];
    for (const tn of trackingNumbers) {
      const order = byTracking.get(tn);
      if (!order) continue;
      const fields = airbillFieldsFromOrder(order, {
        trackingNumber: tn,
        courier: order.courier || order.tracking?.carrier || "PostEx",
        settingsCourier: settings.courier || {},
      });
      items.push({ fields, orderNumber: order.orderNumber || fields.orderId });
    }

    if (!items.length) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No matching store orders for these tracking numbers — cannot build a CrazzyCars airbill.",
        },
        { status: 404 }
      );
    }

    const built = await buildStoreAirbillsPdf(items);
    if (!built.success || !built.pdf) {
      return NextResponse.json(
        { success: false, error: built.error || "Could not build airbill PDF." },
        { status: 500 }
      );
    }

    const download = searchParams.get("download") === "1" || searchParams.get("download") === "true";
    const filename =
      trackingNumbers.length > 1
        ? `crazzycars-airbills-${trackingNumbers.length}.pdf`
        : `crazzycars-airbill-${trackingNumbers[0]}.pdf`;

    return new NextResponse(built.pdf, {
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
