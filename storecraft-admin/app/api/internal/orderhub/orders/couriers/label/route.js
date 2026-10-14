import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { carrierForOrder, findOrder } from "@/lib/orderhub-couriers";
import { requireKey } from "@/lib/orderhub";

export const dynamic = "force-dynamic";

/** Airway bill / label PDF for one order: GET ?id=<orderId> */
export async function GET(req) {
  const denied = requireKey(req, "write");
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  const order = await findOrder(id);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  const carrier = carrierForOrder(order);
  if (!carrier) return NextResponse.json({ error: "This order was not booked with PostEx or Run Courier" }, { status: 400 });
  return carrier.label(req, order);
}
