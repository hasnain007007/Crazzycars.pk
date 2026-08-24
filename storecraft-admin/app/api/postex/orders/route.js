import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Order from "@/lib/models/Order.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { orderGrandTotal } from "@/lib/orderFormat";
import {
  buildCleanStreetAddress,
  buildPostexDeliveryAddress,
  fetchPostexOperationalCities,
  isPrepaidOrder,
  resolvePostexCodAmount,
  resolvePostexApiKey,
  resolvePostexCityName,
} from "@/lib/postex";

export const dynamic = "force-dynamic";

function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Orders for PostEx booking / labels / cancel / loadsheet tabs.
 * mode=unbooked|booked|all
 */
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

    const filter = {};
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

    if (fulfillmentStatus) {
      and.push({ orderStatus: fulfillmentStatus });
    }
    if (paymentStatus) {
      and.push({ paymentStatus });
    }
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
        ],
      });
    }
    if (and.length) filter.$and = and;

    const skip = (page - 1) * limit;
    const [rows, total, settings] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select(
          "orderNumber createdAt orderStatus paymentStatus paymentMethod customer shippingAddress pricing items trackingNumber courier tracking postexLabel internalNotes"
        )
        .lean(),
      Order.countDocuments(filter),
      Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY })
        .lean()
        .then((doc) => doc || Settings.findOne({}).lean()),
    ]);

    let cities = [];
    if (mode === "unbooked") {
      const apiKey = resolvePostexApiKey(settings?.courier);
      if (apiKey) cities = await fetchPostexOperationalCities(apiKey);
    }

    const orders = rows.map((o) => {
      const addr = o.shippingAddress || {};
      const customer = o.customer || {};
      const grand = orderGrandTotal(o);
      const prepaid = isPrepaidOrder(o);
      const items = Array.isArray(o.items) ? o.items : [];
      const city = String(addr.city || "").trim();
      let suggestedCity = city;
      let cityNeedsMap = false;
      if (mode === "unbooked" && cities.length) {
        const resolved = resolvePostexCityName(city, cities, {
          street: addr.street || addr.line1 || addr.address || "",
          state: addr.state || addr.province || "",
        });
        if (resolved.ok && resolved.matched) {
          suggestedCity = resolved.matched;
          cityNeedsMap = Boolean(city && city.toLowerCase() !== resolved.matched.toLowerCase());
        } else {
          cityNeedsMap = Boolean(city);
        }
      }
      const street = buildCleanStreetAddress(addr);
      const deliveryPreview = buildPostexDeliveryAddress(
        { ...addr, street, line1: street, address: street },
        suggestedCity || city
      );
      return {
        id: String(o._id),
        orderNumber: o.orderNumber,
        createdAt: o.createdAt,
        orderStatus: o.orderStatus,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod || (prepaid ? "prepaid" : "cod"),
        name:
          addr.name ||
          customer.name ||
          [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
          "Customer",
        phone: addr.phone || customer.phone || customer.mobile || "",
        email: customer.email || addr.email || "",
        address: [street, suggestedCity || city, addr.zip].filter(Boolean).join(", "),
        street,
        area: String(addr.area || "").trim(),
        city,
        suggestedCity,
        cityNeedsMap,
        province: String(addr.state || addr.province || "").trim(),
        zip: String(addr.zip || addr.postcode || "").trim(),
        country: String(addr.country || "Pakistan").trim(),
        deliveryAddressPreview: deliveryPreview,
        cod: resolvePostexCodAmount(o, {}, settings?.courier || {}),
        total: Math.round(grand),
        weight: 0.5,
        pieces: Math.max(
          1,
          items.reduce((n, it) => n + (Number(it.quantity) || 1), 0) ? 1 : 1
        ),
        trackingNumber: o.trackingNumber || o.tracking?.number || "",
        courier: o.courier || o.tracking?.carrier || "",
        hasLabel: Boolean(o.postexLabel),
        items: items.map((it) => ({
          name: it.name || it.title || "Item",
          quantity: Number(it.quantity) || 1,
          sku: it.sku || "",
        })),
        remarks: "",
      };
    });

    return NextResponse.json({
      success: true,
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Failed to load orders." },
      { status: 500 }
    );
  }
}
