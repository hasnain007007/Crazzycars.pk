import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import ShippingZone from "@/lib/models/Shipping.model";
import { quoteShipping } from "@/lib/shippingZoneWeight";
import { toKg } from "@/lib/shippingEstimate";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const weight = Number(searchParams.get("weight") || 0);
    const unit = String(searchParams.get("unit") || "kg").toLowerCase();
    const country = String(searchParams.get("country") || "").trim();
    const city = String(searchParams.get("city") || "").trim();
    const orderTotal = Number(searchParams.get("order") || searchParams.get("orderTotal") || 0);
    const totalWeightKg = toKg(weight, unit);
    const totalWeightGrams = Math.max(0, Math.round(totalWeightKg * 1000));

    await dbConnect();
    const zones = await ShippingZone.find({ status: "active" }).sort({ sortOrder: 1 }).lean();
    if (!zones.length) {
      return NextResponse.json({
        success: true,
        zoneName: "",
        totalWeight: totalWeightKg,
        totalWeightGrams,
        unit: "kg",
        rates: [],
      });
    }

    const quote = quoteShipping(zones, country, city, totalWeightGrams, orderTotal);
    const price = Math.round(Math.max(0, Number(quote.shippingCost) || 0) * 100) / 100;
    const rates = [
      {
        name: "Standard",
        price,
        minDays: 0,
        maxDays: 0,
        isFree: Boolean(quote.isFree),
        freeShippingOver: quote.freeShippingThreshold || 0,
      },
    ];

    return NextResponse.json({
      success: true,
      zoneName: quote.zoneName || "",
      totalWeight: Math.round(totalWeightKg * 1000) / 1000,
      totalWeightGrams,
      unit: "kg",
      rates,
      country,
      city,
      note: quote.note,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Failed to estimate shipping." },
      { status: 500 }
    );
  }
}
