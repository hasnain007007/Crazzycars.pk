/**
 * POST /api/orders/bulk-wa-confirm
 * Prepare WhatsApp confirmation messages (with Yes/No links) for selected orders.
 * Does not send via Business API — client opens wa.me links one-by-one.
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import Order from "@/lib/models/Order.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { buildWaActionUrl } from "@/lib/waActionToken";
import { getCustomerOrderWhatsAppMessage } from "@/lib/whatsappTemplates";
import { orderGrandTotal } from "@/lib/orderFormat";

export const dynamic = "force-dynamic";

const MAX_IDS = 50;

function customerPhone(order) {
  const direct = String(order?.shippingAddress?.phone ?? order?.customer?.phone ?? "").trim();
  if (direct.replace(/\D/g, "").length >= 10) return direct;
  const email = String(order?.customer?.email || order?.shippingAddress?.email || "");
  const m = email.match(/^(?:guest|invoice)\+(\d+)@/i);
  if (m?.[1]) return m[1];
  return direct;
}

function toWaMeDigits(phone) {
  let cleaned = String(phone || "").replace(/\D/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("0") && cleaned.length === 11) cleaned = `92${cleaned.slice(1)}`;
  if (cleaned.startsWith("3") && cleaned.length === 10) cleaned = `92${cleaned}`;
  return cleaned;
}

function serializeOrderForTemplate(o) {
  return {
    id: String(o._id),
    _id: String(o._id),
    orderNumber: o.orderNumber,
    createdAt: o.createdAt,
    customer: o.customer || {},
    shippingAddress: o.shippingAddress || {},
    items: o.items || [],
    pricing: o.pricing || {},
    total: orderGrandTotal(o),
    paymentMethod: o.paymentMethod || o.payment?.method || "",
    paymentStatus: o.paymentStatus,
    payment: o.payment || {},
    trackingNumber: o.trackingNumber || o.tracking?.number || "",
    trackingUrl: o.trackingUrl || o.tracking?.url || "",
    courier: o.courier || "",
    orderStatus: o.orderStatus,
    codConfirmed: Boolean(o.codConfirmed),
    whatsappNotified: Boolean(o.whatsappNotified),
  };
}

export async function POST(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canManageOrders");
    if (denied) return denied;

    const body = await request.json().catch(() => ({}));
    const rawIds = Array.isArray(body.orderIds) ? body.orderIds : [];
    const includeAlreadyConfirmed = body.includeAlreadyConfirmed === true;
    const includeAlreadySent = body.includeAlreadySent === true;

    const orderIds = [
      ...new Set(
        rawIds
          .map((id) => String(id || "").trim())
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
      ),
    ].slice(0, MAX_IDS);

    if (!orderIds.length) {
      return NextResponse.json(
        { success: false, error: "Select at least one order." },
        { status: 400 }
      );
    }

    await dbConnect();
    const settings =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
      (await Settings.findOne({}).lean()) ||
      {};

    const orders = await Order.find({ _id: { $in: orderIds } })
      .select(
        "orderNumber createdAt customer shippingAddress items pricing total paymentMethod paymentStatus payment trackingNumber tracking trackingUrl courier orderStatus codConfirmed whatsappNotified customerCancelled"
      )
      .lean();

    const byId = new Map(orders.map((o) => [String(o._id), o]));
    const adminBase = String(
      process.env.NEXT_PUBLIC_ADMIN_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        ""
    ).replace(/\/$/, "");

    const results = [];
    let readyCount = 0;
    let skipCount = 0;

    for (const id of orderIds) {
      const order = byId.get(id);
      if (!order) {
        results.push({ orderId: id, success: false, skipped: true, error: "Order not found" });
        skipCount += 1;
        continue;
      }

      const status = String(order.orderStatus || "").toLowerCase();
      if (["cancelled", "refunded"].includes(status) || order.customerCancelled) {
        results.push({
          orderId: id,
          orderNumber: order.orderNumber,
          success: false,
          skipped: true,
          error: "Order cancelled / refunded",
        });
        skipCount += 1;
        continue;
      }

      if (order.codConfirmed && !includeAlreadyConfirmed) {
        results.push({
          orderId: id,
          orderNumber: order.orderNumber,
          success: false,
          skipped: true,
          error: "Already confirmed by customer",
        });
        skipCount += 1;
        continue;
      }

      if (order.whatsappNotified && !includeAlreadySent) {
        results.push({
          orderId: id,
          orderNumber: order.orderNumber,
          success: false,
          skipped: true,
          error: "WhatsApp already opened/sent for this order",
        });
        skipCount += 1;
        continue;
      }

      const phone = customerPhone(order);
      const digits = toWaMeDigits(phone);
      if (!digits || digits.length < 11) {
        results.push({
          orderId: id,
          orderNumber: order.orderNumber,
          success: false,
          skipped: true,
          error: "No valid phone number",
        });
        skipCount += 1;
        continue;
      }

      const confirmUrl = adminBase ? buildWaActionUrl(adminBase, id, "confirm") : "";
      const cancelUrl = adminBase ? buildWaActionUrl(adminBase, id, "cancel") : "";
      const serialized = serializeOrderForTemplate(order);
      const message = getCustomerOrderWhatsAppMessage(serialized, settings, {
        confirmUrl,
        cancelUrl,
        confirmOrderUrl: confirmUrl,
        cancelOrderUrl: cancelUrl,
      });

      if (!message) {
        results.push({
          orderId: id,
          orderNumber: order.orderNumber,
          success: false,
          skipped: true,
          error: "Confirmation template disabled in Settings",
        });
        skipCount += 1;
        continue;
      }

      const waUrl = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
      results.push({
        orderId: id,
        orderNumber: order.orderNumber,
        customerName:
          order.customer?.name ||
          [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(" ") ||
          order.shippingAddress?.name ||
          "Customer",
        phone,
        phoneDigits: digits,
        message,
        waUrl,
        confirmUrl,
        cancelUrl,
        success: true,
        alreadyNotified: Boolean(order.whatsappNotified),
        alreadyConfirmed: Boolean(order.codConfirmed),
      });
      readyCount += 1;
    }

    return NextResponse.json({
      success: true,
      readyCount,
      skipCount,
      total: orderIds.length,
      results,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Could not prepare WhatsApp confirmations." },
      { status: 500 }
    );
  }
}
