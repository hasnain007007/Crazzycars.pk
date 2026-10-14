/**
 * Couriers this website books through, for Order Hub. Every action runs the admin's own courier
 * route (same address checks, COD rules, advance-payment gate, tracking email and activity log).
 *
 * PostEx is built in. Extra couriers (Run Courier on CrazzyCars) come from ./orderhub-couriers-extra,
 * which the installer copies in: an empty list on websites without them.
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Order from "@/lib/models/Order.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { resolvePostexApiKey } from "@/lib/postex";
import { POST as postexBook } from "@/app/api/postex/create-shipment/route";
import { GET as postexLabel } from "@/app/api/postex/label/route";
import { GET as postexTrack } from "@/app/api/postex/track/route";
import { POST as postexCancel } from "@/app/api/postex/cancel/route";
import { callAdminRoute, readJson } from "@/lib/orderhub";
import { EXTRA_CARRIERS } from "@/lib/orderhub-couriers-extra";

export async function loadSettings() {
  await dbConnect();
  return (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) || (await Settings.findOne({}).lean()) || {};
}

const num = (v) => (v === undefined || v === null || v === "" ? undefined : Number(v));

const POSTEX = {
  id: "postex",
  matches: (order) => /postex/i.test(String(order.courier || order.tracking?.carrier || "")),
  describe: (courier) => ({
    id: "postex",
    label: "PostEx",
    services: [],
    fields: { weight: true, pieces: true, cod: true, remarks: true },
    defaultWeightKg: Number(courier.defaultWeight) || 0.5,
    configured: Boolean(resolvePostexApiKey(courier)),
    cancelAlsoCancelsOrder: false,
  }),
  async book(req, input) {
    const body = {
      orderId: String(input.id || ""),
      rebook: input.rebook === true,
      weight: num(input.weightKg),
      pieces: num(input.pieces),
      remarks: input.remarks || undefined,
    };
    if (num(input.codAmount) !== undefined) body.codAmount = num(input.codAmount);
    const res = await callAdminRoute(req, postexBook, { path: "/api/postex/create-shipment", method: "POST", body, by: input.by });
    return { res, data: await readJson(res), carrierName: "PostEx" };
  },
  label: (req, order) => callAdminRoute(req, postexLabel, { path: "/api/postex/label", query: { orderId: String(order._id) } }),
  track: (req, tn) => callAdminRoute(req, postexTrack, { path: "/api/postex/track", query: { trackingNumber: tn } }),
  cancel: (req, order, by) => callAdminRoute(req, postexCancel, { path: "/api/postex/cancel", method: "POST", body: { orderId: String(order._id) }, by }),
};

export const CARRIERS = [POSTEX, ...EXTRA_CARRIERS];

/** Carrier that booked this order (by the courier name saved on it), else the first one. */
export const carrierForOrder = (order) => CARRIERS.find((c) => c.matches(order)) || null;

export async function findOrder(id) {
  await dbConnect();
  return Order.findById(id).select("orderNumber trackingNumber tracking trackingUrl courier runCourierApi orderStatus").lean();
}

export const fail = (data, res, fallback) =>
  NextResponse.json({ error: data?.error || fallback, code: data?.code || undefined }, { status: res?.status >= 400 ? res.status : 400 });
