import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessMinRole } from "@/lib/requireRole";
import { POSTEX_ORDER_API_BASE, resolvePostexApiKey } from "@/lib/postex";
import { dbConnect } from "@/lib/db";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";

/**
 * Optional: create Postex shipment when order is ready to ship.
 * Structure prepared — full booking can be enabled when merchant workflow is defined.
 */
export async function POST(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessMinRole(user, "editor");
    if (denied) return denied;

    await dbConnect();
    const settings =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
      (await Settings.findOne({}).lean());
    const apiKey = resolvePostexApiKey(settings?.courier);
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Postex API key not configured." },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const orderRef = String(body.orderRefNumber || body.orderNumber || "").trim();
    if (!orderRef) {
      return NextResponse.json(
        { success: false, error: "orderRefNumber is required." },
        { status: 400 }
      );
    }

    const createUrl = `${POSTEX_ORDER_API_BASE}/create-order`;

    let res;
    try {
      res = await fetch(createUrl, {
        method: "POST",
        headers: {
          token: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
      });
    } catch {
      return NextResponse.json(
        { success: false, error: "Could not connect to Postex." },
        { status: 502 }
      );
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          error: json?.message || json?.error || "Postex create order failed.",
          postex: json,
        },
        { status: res.status >= 400 ? res.status : 400 }
      );
    }

    const trackingNumber =
      json?.dist?.trackingNumber || json?.data?.trackingNumber || json?.trackingNumber || "";

    return NextResponse.json({
      success: true,
      trackingNumber,
      postex: json,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Create order failed." },
      { status: 500 }
    );
  }
}
