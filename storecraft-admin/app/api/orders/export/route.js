/**
 * CSV export for orders (same filters as list API).
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Order from "@/lib/models/Order.model";
import { orderGrandTotal } from "@/lib/orderFormat";

function utcStartOfDay(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function utcEndOfDay(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function csvCell(v) {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function formatAddress(a) {
  if (!a) return "";
  const region = a.state || a.province;
  const parts = [a.street, a.city, region, a.zip, a.country, a.nif ? `NIF ${a.nif}` : ""].filter(Boolean);
  return parts.join(", ");
}

export async function GET(request) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim();
    const status = (searchParams.get("status") || "").trim();
    const paymentStatus = (searchParams.get("paymentStatus") || "").trim();
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const filter = {};
    if (status && status !== "all") filter.orderStatus = status;
    if (paymentStatus && paymentStatus !== "all") filter.paymentStatus = paymentStatus;
    if (from || to) {
      filter.createdAt = {};
      if (from) {
        const d = new Date(from);
        if (!Number.isNaN(d.getTime())) filter.createdAt.$gte = utcStartOfDay(d);
      }
      if (to) {
        const d = new Date(to);
        if (!Number.isNaN(d.getTime())) filter.createdAt.$lte = utcEndOfDay(d);
      }
    }
    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      const digits = search.replace(/\D/g, "");
      const or = [
        { orderNumber: rx },
        { "customer.name": rx },
        { "customer.email": rx },
        { "customer.phone": rx },
        { "shippingAddress.phone": rx },
      ];
      if (digits.length >= 7) {
        const digitRx = new RegExp(escapeRegex(digits));
        or.push({ "customer.phone": digitRx });
        or.push({ "shippingAddress.phone": digitRx });
        or.push({ "customer.email": new RegExp(`guest\\+${escapeRegex(digits)}`, "i") });
      }
      filter.$or = or;
    }

    const rows = await Order.find(filter).sort({ createdAt: -1 }).limit(5000).lean();

    const header = [
      "Order#",
      "Date",
      "Customer",
      "Items",
      "Total",
      "Status",
      "Payment",
      "Shipping Address",
    ];
    const lines = [header.join(",")];
    for (const o of rows) {
      const itemSummary = Array.isArray(o.items)
        ? o.items.map((i) => `${i.name} x${i.quantity}`).join("; ")
        : "";
      const cust = o.customer?.name || "Guest";
      lines.push(
        [
          csvCell(o.orderNumber),
          csvCell(o.createdAt ? new Date(o.createdAt).toISOString() : ""),
          csvCell(cust),
          csvCell(itemSummary),
          csvCell(orderGrandTotal(o)),
          csvCell(o.orderStatus),
          csvCell(o.paymentStatus),
          csvCell(formatAddress(o.shippingAddress)),
        ].join(",")
      );
    }

    const csv = lines.join("\r\n");
    const filename = `orders-export-${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Export failed." },
      { status: 500 }
    );
  }
}
