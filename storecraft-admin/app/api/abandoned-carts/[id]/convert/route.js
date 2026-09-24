/**
 * POST /api/abandoned-carts/[id]/convert — create an order from an abandoned cart.
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import { allocateOrderNumber } from "@/lib/orderNumber";
import { roundRupees } from "@/lib/currency";
import { syncStockAlertForProduct } from "@/lib/productMutations";
import { sendTemplatedCustomerEmail } from "@/lib/customerLifecycleEmail";
import { serializeCartSession } from "@/lib/abandonedCart";
import CartSession from "@/lib/models/CartSession.model";
import Order from "@/lib/models/Order.model";
import Product from "@/lib/models/Product.model";

export const dynamic = "force-dynamic";

function requestIp(request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
}

function variationFromCartItem(item) {
  if (item?.variationLabel) return String(item.variationLabel).trim();
  if (Array.isArray(item?.selectedOptions) && item.selectedOptions.length) {
    return item.selectedOptions
      .map((o) => {
        if (typeof o === "string") return o;
        const name = o?.name || o?.variationName || "";
        const value = o?.value || o?.optionValue || "";
        return name && value ? `${name}: ${value}` : value || name;
      })
      .filter(Boolean)
      .join(" · ");
  }
  const mc = item?.matchedCombination;
  if (mc && Array.isArray(mc.options) && mc.options.length) {
    return mc.options
      .map((o) => `${o?.name || ""}: ${o?.value || ""}`.replace(/^:\s*|:\s*$/g, "").trim())
      .filter(Boolean)
      .join(" · ");
  }
  return "";
}

export async function POST(request, context) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canManageOrders");
    if (denied) return denied;

    const { id } = await context.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid cart id." }, { status: 400 });
    }

    await dbConnect();
    const body = await request.json().catch(() => ({}));
    const cart = await CartSession.findById(id);
    if (!cart) {
      return NextResponse.json({ success: false, error: "Cart not found." }, { status: 404 });
    }

    if (cart.convertedOrderId || cart.convertedOrderNumber) {
      return NextResponse.json({
        success: true,
        alreadyConverted: true,
        order: {
          id: cart.convertedOrderId ? String(cart.convertedOrderId) : null,
          orderNumber: cart.convertedOrderNumber || "",
        },
        cart: serializeCartSession(cart),
      });
    }

    const items = Array.isArray(cart.items) ? cart.items : [];
    if (items.length < 1) {
      return NextResponse.json(
        { success: false, error: "This cart has no items to convert." },
        { status: 400 }
      );
    }

    const shipIn =
      body.shippingAddress && typeof body.shippingAddress === "object" ? body.shippingAddress : {};
    const name =
      String(body.name || cart.customer?.name || shipIn.name || "").trim() || "Guest";
    const phone = String(body.phone || cart.customer?.phone || shipIn.phone || "").trim();
    const email = String(body.email || cart.customer?.email || shipIn.email || "")
      .trim()
      .toLowerCase();

    if (!phone) {
      return NextResponse.json(
        { success: false, error: "Customer phone is required to create an order." },
        { status: 400 }
      );
    }

    const productIds = [
      ...new Set(
        items
          .map((it) => String(it?.productId || "").trim())
          .filter((pid) => mongoose.Types.ObjectId.isValid(pid))
      ),
    ];
    const products =
      productIds.length > 0
        ? await Product.find({ _id: { $in: productIds } })
            .select("name media pricing inventory")
            .lean()
        : [];
    const byId = new Map(products.map((p) => [String(p._id), p]));

    const normalizedItems = [];
    for (const raw of items) {
      const productIdRaw = String(raw?.productId || "").trim();
      const product =
        productIdRaw && mongoose.Types.ObjectId.isValid(productIdRaw)
          ? byId.get(productIdRaw)
          : null;
      const nameItem = String(raw?.name || product?.name || "").trim();
      if (!nameItem) {
        return NextResponse.json(
          { success: false, error: "A cart item is missing a product name." },
          { status: 400 }
        );
      }
      const quantity = Math.max(1, Math.min(999, Math.round(Number(raw?.quantity) || 1)));
      let unitPrice = Number(raw?.unitPrice ?? raw?.price);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) unitPrice = 0;
      unitPrice = roundRupees(unitPrice);
      const unitCost = Math.max(0, Number(product?.pricing?.costPerItem) || 0);
      const variation = variationFromCartItem(raw).slice(0, 200);
      normalizedItems.push({
        productId: product ? product._id : null,
        articleNo: String(raw?.articleNo || "").trim().slice(0, 100),
        name: nameItem.slice(0, 300),
        image: String(raw?.image || "").trim().slice(0, 1000),
        variation,
        selectedVariation: raw?.selectedVariation || null,
        selectedAddOns: Array.isArray(raw?.selectedAddOns) ? raw.selectedAddOns : [],
        quantity,
        unitPrice,
        unitCost,
        total: roundRupees(quantity * unitPrice),
      });
    }

    const subtotal = roundRupees(normalizedItems.reduce((s, i) => s + Number(i.total || 0), 0));
    const discount = roundRupees(body.discount);
    const shippingCost = roundRupees(body.shippingCost);
    const total = Math.max(0, roundRupees(subtotal - discount + shippingCost));

    const street = String(
      shipIn.street || shipIn.address || shipIn.line1 || body.address || ""
    ).trim();
    const city = String(shipIn.city || body.city || "").trim();

    const orderNumber = await allocateOrderNumber();
    const adminLabel = user.name || user.email || "Admin";
    const note = String(body.note || "").trim().slice(0, 500);

    const attribution = {
      channel: "admin",
      label: "Admin: Abandoned cart",
      source: "abandoned_cart",
      medium: "admin",
      campaign: "",
      referrerHost: "",
      landingPath: cart.lastPath || "",
      firstTouch: null,
      lastTouch: {
        channel: "admin",
        label: "Admin: Abandoned cart",
        source: "abandoned_cart",
        medium: "admin",
        detectedAt: new Date(),
        detection: "admin_convert",
        landingPath: cart.lastPath || "",
      },
    };

    const order = await Order.create({
      orderNumber,
      customer: {
        name,
        email,
        phone,
      },
      items: normalizedItems,
      subtotal,
      shippingCost,
      pricing: {
        subtotal,
        discount,
        shippingCost,
        shippingMethod: shippingCost > 0 ? "standard" : "cod",
        shippingZone: "",
        total,
      },
      orderStatus: "confirmed",
      paymentStatus: "unpaid",
      paymentMethod: "cod",
      currency: "PKR",
      payment: {
        amount: total,
        paidAmount: 0,
      },
      shippingAddress: {
        name,
        email,
        phone,
        street,
        address: street,
        line1: street,
        city,
        country: String(shipIn.country || "Pakistan").trim() || "Pakistan",
      },
      attribution,
      statusHistory: [
        {
          status: "confirmed",
          changedBy: adminLabel,
          changedAt: new Date(),
          note: "Converted from abandoned cart",
        },
      ],
      timeline: [
        {
          status: "confirmed",
          title: "Converted from abandoned cart",
          description:
            note ||
            `Created by ${adminLabel} from cart session ${cart.sessionId || id} · ${normalizedItems.length} item(s)`,
          timestamp: new Date(),
          by: "admin",
        },
      ],
      internalNotes: [
        {
          note:
            note ||
            `Converted from abandoned cart (${cart.sessionId || id}). Phone recovery / WhatsApp order.`,
          addedBy: adminLabel,
          addedAt: new Date(),
        },
      ],
    });

    for (const line of normalizedItems) {
      if (!line.productId) continue;
      try {
        const product = await Product.findById(line.productId);
        if (!product) continue;
        if (product.inventory?.trackInventory === false) continue;
        const qty = Number(product.inventory?.quantity) || 0;
        product.inventory = product.inventory || {};
        product.inventory.quantity = Math.max(0, qty - line.quantity);
        await product.save();
        await syncStockAlertForProduct(product);
      } catch {
        /* non-fatal */
      }
    }

    cart.status = "recovered";
    cart.recoveredAt = new Date();
    cart.convertedOrderId = order._id;
    cart.convertedOrderNumber = order.orderNumber;
    cart.items = [];
    cart.itemCount = 0;
    cart.subtotal = 0;
    cart.reminders = cart.reminders || [];
    cart.reminders.push({
      channel: "whatsapp",
      sentAt: new Date(),
      status: "sent",
      note: `Converted to order ${order.orderNumber} by ${adminLabel}`,
    });
    await cart.save();

    await logActivity({
      user: user.userId || user.id || user._id,
      userName: adminLabel,
      action: `Abandoned cart converted to ${orderNumber}`,
      resource: "Order",
      resourceId: order._id.toString(),
      details: {
        orderNumber,
        cartId: String(cart._id),
        total,
        itemCount: normalizedItems.length,
      },
      type: "create",
      ip: requestIp(request),
    });

    sendTemplatedCustomerEmail(order, "orderConfirmation").catch((e) =>
      console.error("[email] abandoned-cart convert confirmation:", e?.message || e)
    );

    return NextResponse.json({
      success: true,
      order: {
        id: order._id.toString(),
        orderNumber: order.orderNumber,
        total,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
      },
      cart: serializeCartSession(cart),
    });
  } catch (error) {
    console.error("Abandoned cart convert failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Could not convert cart to order." },
      { status: 500 }
    );
  }
}
