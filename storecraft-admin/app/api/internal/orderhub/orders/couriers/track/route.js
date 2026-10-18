import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { carrierForOrder, findOrder } from "@/lib/orderhub-couriers";
import { readJson, requireKey } from "@/lib/orderhub";

export const dynamic = "force-dynamic";

/** Latest courier status for one order: GET ?id=<orderId> */
export async function GET(req) {
  const denied = requireKey(req, "write");
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  const order = await findOrder(id);
  const tn = String(order?.trackingNumber || order?.tracking?.number || "").trim();
  if (!tn) return NextResponse.json({ error: "This order has no tracking number" }, { status: 400 });
  const carrier = carrierForOrder(order);
  if (!carrier) return NextResponse.json({ error: "This order was not booked with PostEx or Run Courier" }, { status: 400 });
  const res = await carrier.track(req, tn);
  const data = await readJson(res);
  if (!res.ok || data.success === false) return NextResponse.json({ error: data.error || "Tracking failed" }, { status: 400 });
  const events = (Array.isArray(data.events) ? data.events : []).map((e) => ({
    time: [e.date, e.time].filter(Boolean).join(" "),
    description: e.description || e.status || "",
    location: e.location || "",
  }));
  return NextResponse.json({
    ok: true,
    trackingNumber: tn,
    trackingLink: order?.trackingUrl || order?.tracking?.url || "",
    status: data.status || "",
    events,
  });
}
