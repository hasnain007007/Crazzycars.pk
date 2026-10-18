/**
 * Run Courier for Order Hub (CrazzyCars). Books Leopards, TCS, M&P, Trax and others through the
 * admin's own Run Courier routes. See lib/orderhub-couriers.js.
 */
import {
  RUN_COURIER_APIS,
  RUN_COURIER_DEFAULT_API,
  RUN_COURIER_SERVICE_TYPES,
  displayCourierName,
  isRunCourierOrder,
  resolveRunCourierApiKey,
  resolveRunCourierClientCode,
} from "@/lib/runcourier";
import { POST as rcBook } from "@/app/api/runcourier/create-shipment/route";
import { GET as rcLabel } from "@/app/api/runcourier/label/route";
import { GET as rcTrack } from "@/app/api/runcourier/track/route";
import { POST as rcCancel } from "@/app/api/runcourier/cancel/route";
import { callAdminRoute, readJson } from "@/lib/orderhub";

const num = (v) => (v === undefined || v === null || v === "" ? undefined : Number(v));

export const EXTRA_CARRIERS = [
  {
    id: "runcourier",
    matches: (order) => isRunCourierOrder(order),
    describe: (courier) => ({
      id: "runcourier",
      label: "Run Courier",
      services: RUN_COURIER_APIS.map((code) => ({ code, label: code === "Leopard2" ? "Leopards" : code })),
      defaultService: courier.runCourierDefaultApi || RUN_COURIER_DEFAULT_API,
      serviceLabel: "Delivered by",
      options: { serviceTypes: RUN_COURIER_SERVICE_TYPES },
      fields: { weight: true, pieces: true, cod: true, remarks: true },
      defaultWeightKg: Number(courier.runCourierDefaultWeight || courier.defaultWeight) || 0.5,
      configured: Boolean(resolveRunCourierApiKey(courier) && resolveRunCourierClientCode(courier)),
      cancelAlsoCancelsOrder: false,
    }),
    async book(req, input) {
      const body = {
        orderId: String(input.id || ""),
        selectedApi: input.service || undefined,
        weight: num(input.weightKg),
        pieces: num(input.pieces),
        remarks: input.remarks || undefined,
        rebook: input.rebook === true,
      };
      if (num(input.codAmount) !== undefined) body.codAmount = num(input.codAmount);
      const res = await callAdminRoute(req, rcBook, { path: "/api/runcourier/create-shipment", method: "POST", body, by: input.by });
      const data = await readJson(res);
      return { res, data, carrierName: data.order?.courier || displayCourierName(body.selectedApi) || "Run Courier", service: data.order?.runCourierApi || body.selectedApi || "" };
    },
    label: (req, order) => callAdminRoute(req, rcLabel, { path: "/api/runcourier/label", query: { orderId: String(order._id) } }),
    track: (req, tn) => callAdminRoute(req, rcTrack, { path: "/api/runcourier/track", query: { trackingNumber: tn } }),
    cancel: (req, order, by) => callAdminRoute(req, rcCancel, { path: "/api/runcourier/cancel", method: "POST", body: { orderId: String(order._id) }, by }),
  },
];
