import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import ShippingZone from "@/lib/models/Shipping.model";
import { quoteShipping } from "@/lib/shippingZoneWeight";

export const dynamic = "force-dynamic";

async function calculateQuote({ country, city, province, totalWeight, orderSubtotal }) {
  await dbConnect();
  const zones = await ShippingZone.find({ status: "active" }).sort({ sortOrder: 1 }).lean();
  const data = quoteShipping(
    zones,
    String(country || "Pakistan").trim(),
    String(city || "").trim(),
    Math.max(0, Number(totalWeight) || 0),
    Math.max(0, Number(orderSubtotal) || 0),
    String(province || "").trim()
  );
  return data;
}

/** GET /api/shipping/calculate?province=Punjab&total=2999&city=Lahore */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const province = searchParams.get("province") || searchParams.get("state") || "";
    const city = searchParams.get("city") || "";
    const total = searchParams.get("total") || searchParams.get("orderSubtotal") || "0";
    const totalWeight = searchParams.get("totalWeight") || "0";
    const country = searchParams.get("country") || "Pakistan";

    const data = await calculateQuote({
      country,
      city,
      province,
      totalWeight,
      orderSubtotal: total,
    });

    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Calculate failed." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const country = String(body.country || "Pakistan").trim();
    const city = String(body.city || "").trim();
    const province = String(body.province || body.state || "").trim();
    const totalWeight = parseFloat(body.totalWeight) || 0;
    const orderSubtotal = Math.max(0, Number(body.orderSubtotal) || 0);

    const data = await calculateQuote({
      country,
      city,
      province,
      totalWeight,
      orderSubtotal,
    });

    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Calculate failed." }, { status: 500 });
  }
}
