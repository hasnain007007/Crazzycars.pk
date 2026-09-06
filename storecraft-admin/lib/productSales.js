/**
 * Aggregate sold qty / revenue / customers for one or more products from Order line items.
 */
import mongoose from "mongoose";
import Order from "@/lib/models/Order.model";

const EXCLUDED_STATUSES = ["cancelled", "refunded"];

function asObjectId(id) {
  if (!id) return null;
  const s = String(id);
  if (!mongoose.Types.ObjectId.isValid(s)) return null;
  return new mongoose.Types.ObjectId(s);
}

function lineRevenue(item) {
  const total = Number(item?.total);
  if (Number.isFinite(total) && total >= 0) return total;
  const qty = Number(item?.quantity) || 0;
  const unit = Number(item?.unitPrice) || 0;
  return qty * unit;
}

function customerKey(order) {
  const c = order?.customer || {};
  const phone = String(c.phone || order?.shippingAddress?.phone || "")
    .replace(/\D/g, "")
    .slice(-11);
  const email = String(c.email || "")
    .trim()
    .toLowerCase();
  const cid = c.customerId ? String(c.customerId._id || c.customerId) : "";
  if (cid && cid !== "null" && cid !== "undefined") return `id:${cid}`;
  if (phone.length >= 7) return `ph:${phone}`;
  if (email && !email.startsWith("guest+")) return `em:${email}`;
  if (email) return `em:${email}`;
  return `ord:${String(order?._id || "")}`;
}

function customerDisplay(order) {
  const c = order?.customer || {};
  const name =
    String(c.name || "").trim() ||
    [c.firstName, c.lastName].filter(Boolean).join(" ").trim() ||
    "Guest";
  return {
    name,
    email: String(c.email || "").trim(),
    phone: String(c.phone || order?.shippingAddress?.phone || "").trim(),
    customerId: c.customerId ? String(c.customerId._id || c.customerId) : null,
  };
}

/**
 * Sales summary for a single product.
 * @param {string|import('mongoose').Types.ObjectId} productId
 * @param {{ articleNo?: string, limitCustomers?: number, limitOrders?: number }} [opts]
 */
export async function getProductSalesSummary(productId, opts = {}) {
  const oid = asObjectId(productId);
  if (!oid) {
    return emptySummary();
  }

  const articleNo = String(opts.articleNo || "").trim();
  const limitCustomers = Math.min(200, Math.max(1, Number(opts.limitCustomers) || 50));
  const limitOrders = Math.min(100, Math.max(1, Number(opts.limitOrders) || 30));

  const itemMatch = articleNo
    ? {
        $or: [{ "items.productId": oid }, { "items.articleNo": articleNo }],
      }
    : { "items.productId": oid };

  const orders = await Order.find({
    orderStatus: { $nin: EXCLUDED_STATUSES },
    ...itemMatch,
  })
    .select(
      "orderNumber createdAt orderStatus paymentStatus customer shippingAddress.phone items"
    )
    .sort({ createdAt: -1 })
    .lean();

  let qtySold = 0;
  let revenue = 0;
  const orderIds = new Set();
  const customersMap = new Map();
  const recentOrders = [];

  for (const order of orders) {
    const matching = (order.items || []).filter((it) => {
      const pid = it.productId ? String(it.productId) : "";
      if (pid && pid === String(oid)) return true;
      if (articleNo && String(it.articleNo || "").trim() === articleNo) return true;
      return false;
    });
    if (!matching.length) continue;

    const lineQty = matching.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
    const lineRev = matching.reduce((s, it) => s + lineRevenue(it), 0);
    qtySold += lineQty;
    revenue += lineRev;
    orderIds.add(String(order._id));

    const cust = customerDisplay(order);
    const key = customerKey(order);
    const existing = customersMap.get(key);
    const orderRow = {
      id: String(order._id),
      orderNumber: order.orderNumber || "",
      createdAt: order.createdAt || null,
      orderStatus: order.orderStatus || "",
      paymentStatus: order.paymentStatus || "",
      qty: lineQty,
      revenue: lineRev,
    };

    if (!existing) {
      customersMap.set(key, {
        key,
        ...cust,
        orderCount: 1,
        qtyBought: lineQty,
        revenue: lineRev,
        lastOrderAt: order.createdAt || null,
        orders: [orderRow],
      });
    } else {
      existing.orderCount += 1;
      existing.qtyBought += lineQty;
      existing.revenue += lineRev;
      if (
        order.createdAt &&
        (!existing.lastOrderAt || new Date(order.createdAt) > new Date(existing.lastOrderAt))
      ) {
        existing.lastOrderAt = order.createdAt;
      }
      if (existing.orders.length < 10) existing.orders.push(orderRow);
    }

    if (recentOrders.length < limitOrders) {
      recentOrders.push({
        ...orderRow,
        customerName: cust.name,
        customerPhone: cust.phone,
        customerEmail: cust.email,
      });
    }
  }

  const customers = [...customersMap.values()]
    .sort((a, b) => {
      const ta = a.lastOrderAt ? new Date(a.lastOrderAt).getTime() : 0;
      const tb = b.lastOrderAt ? new Date(b.lastOrderAt).getTime() : 0;
      return tb - ta;
    })
    .slice(0, limitCustomers);

  return {
    qtySold,
    revenue,
    orderCount: orderIds.size,
    customerCount: customersMap.size,
    customers,
    recentOrders,
  };
}

export function emptySummary() {
  return {
    qtySold: 0,
    revenue: 0,
    orderCount: 0,
    customerCount: 0,
    customers: [],
    recentOrders: [],
  };
}

/**
 * Batch sold qty + revenue for many product ids (products list).
 * @param {Array<string|import('mongoose').Types.ObjectId>} productIds
 */
export async function getProductSalesBatch(productIds) {
  const ids = [...new Set((productIds || []).map(asObjectId).filter(Boolean))];
  if (!ids.length) return new Map();

  const rows = await Order.aggregate([
    {
      $match: {
        orderStatus: { $nin: EXCLUDED_STATUSES },
        "items.productId": { $in: ids },
      },
    },
    { $unwind: "$items" },
    { $match: { "items.productId": { $in: ids } } },
    {
      $group: {
        _id: "$items.productId",
        qtySold: { $sum: { $ifNull: ["$items.quantity", 0] } },
        revenue: {
          $sum: {
            $cond: [
              { $gt: [{ $ifNull: ["$items.total", 0] }, 0] },
              "$items.total",
              {
                $multiply: [
                  { $ifNull: ["$items.quantity", 0] },
                  { $ifNull: ["$items.unitPrice", 0] },
                ],
              },
            ],
          },
        },
        orderIds: { $addToSet: "$_id" },
      },
    },
    {
      $project: {
        qtySold: 1,
        revenue: 1,
        orderCount: { $size: "$orderIds" },
      },
    },
  ]);

  const map = new Map();
  for (const row of rows) {
    map.set(String(row._id), {
      qtySold: Number(row.qtySold) || 0,
      revenue: Number(row.revenue) || 0,
      orderCount: Number(row.orderCount) || 0,
    });
  }
  return map;
}
