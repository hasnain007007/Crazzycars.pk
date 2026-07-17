import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Order from "@/lib/models/Order.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { fetchPostexLabel } from "@/lib/postex";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const trackingNumber = String(searchParams.get("trackingNumber") || "").trim();
    const orderId = String(searchParams.get("orderId") || "").trim();

    await dbConnect();
    const settings =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
      (await Settings.findOne({}).lean()) ||
      {};

    let labelBase64 = "";
    let tn = trackingNumber;

    if (orderId) {
      const order = await Order.findById(orderId).select("trackingNumber postexLabel tracking").lean();
      if (order) {
        tn = tn || order.trackingNumber || order.tracking?.number || "";
        labelBase64 = String(order.postexLabel || "").trim();
      }
    }

    if (!labelBase64 && tn) {
      const fetched = await fetchPostexLabel(tn, { settingsCourier: settings.courier });
      if (fetched.success) labelBase64 = fetched.label;
    }

    if (!labelBase64) {
      return NextResponse.json(
        { success: false, error: "Shipping label not available for this order." },
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

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="postex-label-${tn || "shipment"}.pdf"`,
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
