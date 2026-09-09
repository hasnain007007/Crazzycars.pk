import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Order from "@/lib/models/Order.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { orderGrandTotal } from "@/lib/orderFormat";
import { resolveRunCourierCodAmount, isPrepaidOrderForCod, RUN_COURIER_DEFAULT_API } from "@/lib/runcourier";

export const dynamic = "force-dynamic";

function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Calendar day bounds in Pakistan time (UTC+5). */
function pkDayStart(ymd) {
  const s = String(ymd || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return new Date(`${s}T00:00:00+05:00`);
}
function pkDayEnd(ymd) {
  const s = String(ymd || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return new Date(`${s}T23:59:59.999+05:00`);
}

/** Run Courier shipment (exclude PostEx-only). */
function runCourierBookedClause() {
  return {
    trackingNumber: { $exists: true, $nin: [null, ""] },
    $or: [
      { runCourierApi: { $exists: true, $nin: [null, ""] } },
      { runCourierLabel: { $exists: true, $nin: [null, ""] } },
      { courier: /run\s*courier/i },
      // Leopard CN format from Run Courier / Leopard2 bookings
      { trackingNumber: /^GW\d{6,}/i },
    ],
  };
}

export async function GET(request) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const mode = String(searchParams.get("mode") || "unbooked").toLowerCase();
    const search = String(searchParams.get("search") || searchParams.get("q") || "").trim();
    const paymentStatus = String(searchParams.get("paymentStatus") || "").trim();
    const fulfillmentStatus = String(
      searchParams.get("status") || searchParams.get("fulfillmentStatus") || ""
    ).trim();
    let from = String(searchParams.get("from") || "").trim();
    let to = String(searchParams.get("to") || "").trim();
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit"), 10) || 50));
    const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);

    // Swap inverted ranges (e.g. user picked end before start).
    if (from && to && from > to) {
      const tmp = from;
      from = to;
      to = tmp;
    }

    const and = [];
    if (mode === "unbooked") {
      and.push({
        $or: [
          { trackingNumber: { $exists: false } },
          { trackingNumber: null },
          { trackingNumber: "" },
        ],
      });
      and.push({ orderStatus: { $nin: ["cancelled", "refunded", "delivered"] } });
    } else if (mode === "booked") {
      and.push(runCourierBookedClause());
    }

    if (fulfillmentStatus) and.push({ orderStatus: fulfillmentStatus });
    if (paymentStatus) and.push({ paymentStatus });

    const start = from ? pkDayStart(from) : null;
    const end = to ? pkDayEnd(to) : null;
    const hasDate = Boolean(start || end);

    if (hasDate) {
      const range = {};
      if (start) range.$gte = start;
      if (end) range.$lte = end;

      if (mode === "booked") {
        // Courier booking day: either dedicated stamp or shippedAt.
        and.push({
          $or: [{ runCourierBookedAt: range }, { shippedAt: range }],
        });
      } else {
        and.push({ createdAt: range });
      }
    }

    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      and.push({
        $or: [
          { orderNumber: rx },
          { "customer.name": rx },
          { "customer.firstName": rx },
          { "customer.lastName": rx },
          { "shippingAddress.name": rx },
          { "customer.phone": rx },
          { "shippingAddress.phone": rx },
          { "shippingAddress.city": rx },
          { trackingNumber: rx },
          { runCourierApi: rx },
          { courier: rx },
        ],
      });
    }

    const filter = and.length ? { $and: and } : {};
    const skip = (page - 1) * limit;
    const sort =
      mode === "booked"
        ? { runCourierBookedAt: -1, shippedAt: -1, createdAt: -1 }
        : { createdAt: -1 };

    const [rows, total, settings] = await Promise.all([
      Order.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select(
          "orderNumber createdAt shippedAt runCourierBookedAt orderStatus paymentStatus paymentMethod customer shippingAddress pricing items trackingNumber courier tracking runCourierLabel runCourierApi payment"
        )
        .lean(),
      Order.countDocuments(filter),
      Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY })
        .lean()
        .then((doc) => doc || Settings.findOne({}).lean()),
    ]);

    const defaultApi = settings?.courier?.runCourierDefaultApi || RUN_COURIER_DEFAULT_API;

    const orders = rows.map((o) => {
      const addr = o.shippingAddress || {};
      const customer = o.customer || {};
      const prepaid = isPrepaidOrderForCod(o);
      const codAmount = resolveRunCourierCodAmount(o, {});
      const bookedAt = o.runCourierBookedAt || o.shippedAt || null;
      return {
        id: String(o._id),
        orderNumber: o.orderNumber,
        createdAt: o.createdAt,
        bookedAt,
        shippedAt: o.shippedAt || null,
        orderStatus: o.orderStatus,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod || (prepaid ? "prepaid" : "cod"),
        name: addr.name || customer.name || "—",
        phone: addr.phone || customer.phone || "",
        city: addr.city || "",
        address: addr.street || addr.line1 || addr.address || "",
        total: orderGrandTotal(o),
        codAmount,
        trackingNumber: o.trackingNumber || o.tracking?.number || "",
        courier: o.courier || "",
        runCourierApi: o.runCourierApi || "",
        lastStatus: o.tracking?.lastStatus || "",
        lastStatusAt: o.tracking?.lastStatusAt || null,
        hasLabel: Boolean(o.runCourierLabel),
        itemCount: Array.isArray(o.items) ? o.items.length : 0,
        suggestedApi: defaultApi,
      };
    });

    return NextResponse.json({
      success: true,
      orders,
      total,
      page,
      limit,
      defaultApi,
      filters: { mode, from: from || null, to: to || null, search: search || null },
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Could not load orders." },
      { status: 500 }
    );
  }
}
