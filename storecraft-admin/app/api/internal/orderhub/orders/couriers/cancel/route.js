import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { carrierForOrder, fail, findOrder } from "@/lib/orderhub-couriers";
import { readJson, requireKey } from "@/lib/orderhub";

/**
 * Cancel the courier shipment. As in the admin, a shipped order goes back to processing
 * (the order itself is not cancelled). POST { id, by? }
 */
export async function POST(req) {
  const denied = requireKey(req, "write");
  if (denied) return denied;
  const input = await req.json().catch(() => ({}));
  const id = String(input.id || "");
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  const order = await findOrder(id);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  const carrier = carrierForOrder(order);
  if (!carrier) return NextResponse.json({ error: "This order was not booked with PostEx or Run Courier" }, { status: 400 });
  const res = await carrier.cancel(req, order, input.by);
  const data = await readJson(res);
  if (!res.ok || !data.success) return fail(data, res, "Cancel failed");
  return NextResponse.json({
    ok: true,
    orderStatus: order.orderStatus === "shipped" ? "processing" : undefined,
    message: `Shipment ${data.trackingNumber || ""} cancelled. The order is back to processing.`,
  });
}
