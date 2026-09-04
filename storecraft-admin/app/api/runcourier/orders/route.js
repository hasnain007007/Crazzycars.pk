import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Order from "@/lib/models/Order.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { orderGrandTotal } from "@/lib/orderFormat";
import { resolveRunCourierCodAmount, isPrepaidOrderForCod } from "@/lib/runcourier";

export const dynamic = "force-dynamic";

function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit"), 10) || 50));
    const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);

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
      and.push({ trackingNumber: { $exists: true, $nin: [null, ""] } });
    }

    if (fulfillmentStatus) and.push({ orderStatus: fulfillmentStatus });
    if (paymentStatus) and.push({ paymentStatus });
    if (from || to) {
      const createdAt = {};
      if (from) createdAt.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        createdAt.$lte = end;
      }
      and.push({ createdAt });
    }
    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      and.push({
        $or: [
          { orderNumber: rx },
          { "customer.name": rx },
          { "customer.phone": rx },
          { "shippingAddress.phone": rx },
          { "shippingAddress.city": rx },
          { trackingNumber: rx },
          { runCourierApi: rx },
        ],
      });
    }

    const filter = and.length ? { $and: and } : {};
    const skip = (page - 1) * limit;

    const [rows, total, settings] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select(
          "orderNumber createdAt orderStatus paymentStatus paymentMethod customer shippingAddress pricing items trackingNumber courier tracking runCourierLabel runCourierApi payment"
        )
        .lean(),
      Order.countDocuments(filter),
      Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY })
        .lean()
        .then((doc) => doc || Settings.findOne({}).lean()),
    ]);

    const defaultApi = settings?.courier?.runCourierDefaultApi || "Auto";

    const orders = rows.map((o) => {
      const addr = o.shippingAddress || {};
      const customer = o.customer || {};
      const prepaid = isPrepaidOrderForCod(o);
      const codAmount = resolveRunCourierCodAmount(o, {});
      return {
        id: String(o._id),
        orderNumber: o.orderNumber,
        createdAt: o.createdAt,
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
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Could not load orders." },
      { status: 500 }
    );
  }
}
