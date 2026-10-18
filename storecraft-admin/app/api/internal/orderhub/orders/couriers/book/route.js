import { NextResponse } from "next/server";
import { CARRIERS, fail } from "@/lib/orderhub-couriers";
import { requireKey } from "@/lib/orderhub";

/**
 * Book a shipment through the admin's own booking route (tracking number, order marked shipped,
 * airway bill, customer tracking email, activity log).
 * POST { id, carrier: "postex" | "runcourier", service?, weightKg?, pieces?, codAmount?, remarks?, rebook?, by? }
 */
export async function POST(req) {
  const denied = requireKey(req, "write");
  if (denied) return denied;
  const input = await req.json().catch(() => ({}));
  const carrier = CARRIERS.find((c) => c.id === input.carrier);
  if (!carrier) return NextResponse.json({ error: `Unsupported courier: ${input.carrier || "(none)"}` }, { status: 400 });
  try {
    const { res, data, carrierName, service } = await carrier.book(req, input);
    if (!res.ok || !data.success) return fail(data, res, "Booking failed");
    return NextResponse.json({
      ok: true,
      trackingNumber: data.trackingNumber,
      trackingLink: data.trackingUrl || "",
      carrierName,
      service: service || "",
      hasLabel: true,
      message: data.message || "",
      email: data.trackingEmail ? { sent: Boolean(data.trackingEmail.sent), error: data.trackingEmail.error || null } : null,
    });
  } catch (e) {
    console.error("[internal/orderhub/couriers/book]", e);
    return NextResponse.json({ error: "Booking failed" }, { status: 500 });
  }
}
