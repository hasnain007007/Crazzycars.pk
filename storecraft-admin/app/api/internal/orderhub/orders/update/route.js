import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { PUT as updateOrder } from "@/app/api/orders/[id]/route";
import { callAdminRoute, readJson, requireKey } from "@/lib/orderhub";

const STATUSES = ["confirmed", "processing", "packed", "shipped", "delivered", "returned", "cancelled", "refunded"];

/**
 * Status / tracking change from Order Hub. Runs through PUT /api/orders/[id] so status history,
 * customer emails and activity log behave exactly as when staff change it here.
 * POST { id, status?, tracking?: { number, carrier, url }, by? }  Authorization: Bearer ORDERHUB_WRITE_TOKEN
 */
export async function POST(req) {
  const denied = requireKey(req, "write");
  if (denied) return denied;
  try {
    const input = await req.json().catch(() => null);
    const id = String(input?.id || "");
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    const body = {};
    if (input.status !== undefined && input.status !== null) {
      if (!STATUSES.includes(input.status)) return NextResponse.json({ error: `Unsupported status: ${input.status}` }, { status: 400 });
      body.orderStatus = input.status;
      body.statusChangeNote = `Updated from Order Hub by ${String(input.by || "staff").slice(0, 60)}`;
    }
    if (input.tracking && typeof input.tracking === "object") {
      body.trackingNumber = String(input.tracking.number || "").trim();
      if (input.tracking.carrier) body.courier = String(input.tracking.carrier).trim();
      if (input.tracking.url) body.trackingUrl = String(input.tracking.url).trim();
    }
    if (!Object.keys(body).length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

    const res = await callAdminRoute(req, updateOrder, { path: `/api/orders/${id}`, method: "PUT", body, by: input.by, params: { id } });
    const data = await readJson(res);
    if (!res.ok || data.success === false) {
      return NextResponse.json({ error: data.error || "Update failed" }, { status: res.status >= 400 ? res.status : 400 });
    }
    return NextResponse.json({ ok: true, changed: true, status: data.order?.orderStatus || input.status });
  } catch (e) {
    console.error("[internal/orderhub/orders/update]", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
