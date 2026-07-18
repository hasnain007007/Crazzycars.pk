/**
 * One-tap confirm/cancel from WhatsApp admin alert (signed link, no login).
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import Order from "@/lib/models/Order.model";
import { verifyWaActionToken } from "@/lib/waActionToken";
import { ORDER_STATUS_TIMELINE_TITLES } from "@/lib/orderStatusTimeline";

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlPage({ title, body, ok }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
    .card { max-width: 420px; margin: 40px auto; background: #fff; border-radius: 16px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
    h1 { font-size: 1.25rem; margin: 0 0 8px; color: ${ok ? "#15803d" : "#b91c1c"}; }
    p { margin: 0; line-height: 1.5; color: #475569; }
    a { display: inline-block; margin-top: 16px; color: #1d6fb8; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${escapeHtml(title)}</h1>
    <p>${body}</p>
  </div>
</body>
</html>`;
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const action = String(searchParams.get("action") || "").toLowerCase();
    const token = String(searchParams.get("t") || "");

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return new NextResponse(
        htmlPage({ title: "Invalid order", body: "This order link is not valid.", ok: false }),
        { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }
    if (!["confirm", "cancel"].includes(action)) {
      return new NextResponse(
        htmlPage({ title: "Unknown action", body: "Use Confirm or Cancel from the WhatsApp message.", ok: false }),
        { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    const verified = verifyWaActionToken(token, id, action);
    if (!verified.ok) {
      return new NextResponse(
        htmlPage({ title: "Link expired or invalid", body: verified.error, ok: false }),
        { status: 403, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    await dbConnect();
    const order = await Order.findById(id);
    if (!order) {
      return new NextResponse(
        htmlPage({ title: "Order not found", body: "This order no longer exists.", ok: false }),
        { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    const nextStatus = action === "confirm" ? "confirmed" : "cancelled";
    const already = order.orderStatus === nextStatus;
    if (!already) {
      order.orderStatus = nextStatus;
      if (action === "confirm") {
        order.codConfirmed = true;
      }
      if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
      order.statusHistory.push({
        status: nextStatus,
        changedBy: "WhatsApp customer link",
        changedAt: new Date(),
        note:
          action === "confirm"
            ? "Customer confirmed order via WhatsApp link"
            : "Customer cancelled / did not confirm via WhatsApp link",
      });
      const statusInfo = ORDER_STATUS_TIMELINE_TITLES[nextStatus] || {
        title: nextStatus,
        description: "",
      };
      if (!Array.isArray(order.timeline)) order.timeline = [];
      order.timeline.push({
        status: nextStatus,
        title: statusInfo.title,
        description:
          action === "confirm"
            ? "Customer confirmed via WhatsApp"
            : "Customer cancelled via WhatsApp",
        timestamp: new Date(),
        by: "customer",
      });
      order.markModified("timeline");
      await order.save();
    }

    const storeUrl = String(process.env.NEXT_PUBLIC_STORE_URL || "").replace(/\/$/, "");
    const label = action === "confirm" ? "confirmed" : "cancelled";
    return new NextResponse(
      htmlPage({
        title: already ? `Already ${label}` : `Order ${label}`,
        body: `Shukriya! Order <strong>${escapeHtml(order.orderNumber)}</strong> is now <strong>${escapeHtml(nextStatus)}</strong>.${
          action === "confirm"
            ? " We will process your order shortly."
            : " Your order has been cancelled."
        }${
          storeUrl
            ? ` <a href="${escapeHtml(storeUrl)}">Back to Crazzycars.pk</a>`
            : ""
        }`,
        ok: true,
      }),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (error) {
    return new NextResponse(
      htmlPage({
        title: "Something went wrong",
        body: error.message || "Could not update order.",
        ok: false,
      }),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}
