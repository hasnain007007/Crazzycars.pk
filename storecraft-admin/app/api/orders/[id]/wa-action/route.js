/**
 * WhatsApp confirm/cancel links.
 * GET = confirmation page only (no DB change) — safe for link previews/crawlers.
 * POST = apply the status change after the human taps Confirm.
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

function htmlPage({ title, body, ok, formHtml = "" }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
    .card { max-width: 420px; margin: 40px auto; background: #fff; border-radius: 16px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
    h1 { font-size: 1.25rem; margin: 0 0 8px; color: ${ok ? "#15803d" : "#0f172a"}; }
    p { margin: 0; line-height: 1.5; color: #475569; }
    a { display: inline-block; margin-top: 16px; color: #1d6fb8; font-weight: 600; }
    .actions { display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap; }
    button, .btn {
      appearance: none; border: 0; border-radius: 10px; padding: 12px 16px;
      font-weight: 700; font-size: 14px; cursor: pointer; text-decoration: none;
    }
    .btn-primary { background: #15803d; color: #fff; }
    .btn-danger { background: #b91c1c; color: #fff; }
    .btn-muted { background: #e2e8f0; color: #334155; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${escapeHtml(title)}</h1>
    <p>${body}</p>
    ${formHtml}
  </div>
</body>
</html>`;
}

function parseActionRequest(request, id) {
  const { searchParams } = new URL(request.url);
  const action = String(searchParams.get("action") || "").toLowerCase();
  const token = String(searchParams.get("t") || "");
  return { id: String(id || ""), action, token };
}

async function applyWaAction({ id, action, token }) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { status: 400, title: "Invalid order", body: "This order link is not valid.", ok: false };
  }
  if (!["confirm", "cancel"].includes(action)) {
    return {
      status: 400,
      title: "Unknown action",
      body: "Use Confirm or Cancel from the WhatsApp message.",
      ok: false,
    };
  }

  const verified = verifyWaActionToken(token, id, action);
  if (!verified.ok) {
    return { status: 403, title: "Link expired or invalid", body: verified.error, ok: false };
  }

  await dbConnect();
  const order = await Order.findById(id);
  if (!order) {
    return { status: 404, title: "Order not found", body: "This order no longer exists.", ok: false };
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
      changedBy: "WhatsApp action link",
      changedAt: new Date(),
      note:
        action === "confirm"
          ? "Order confirmed via signed WhatsApp action link"
          : "Order cancelled via signed WhatsApp action link",
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
          ? "Confirmed via WhatsApp action link"
          : "Cancelled via WhatsApp action link",
      timestamp: new Date(),
      by: "whatsapp-link",
    });
    order.markModified("timeline");
    await order.save();
  }

  const storeUrl = String(process.env.NEXT_PUBLIC_STORE_URL || "").replace(/\/$/, "");
  const label = action === "confirm" ? "confirmed" : "cancelled";
  return {
    status: 200,
    title: already ? `Already ${label}` : `Order ${label}`,
    body: `Order <strong>${escapeHtml(order.orderNumber)}</strong> is now <strong>${escapeHtml(nextStatus)}</strong>.${
      action === "confirm"
        ? " You can continue processing it in the admin panel."
        : " The order has been cancelled."
    }${storeUrl ? ` <a href="${escapeHtml(storeUrl)}">Back to store</a>` : ""}`,
    ok: true,
  };
}

/** GET: show confirm UI only — never mutate (WhatsApp/Facebook link previews use GET). */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { action, token } = parseActionRequest(request, id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return new NextResponse(
        htmlPage({ title: "Invalid order", body: "This order link is not valid.", ok: false }),
        { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }
    if (!["confirm", "cancel"].includes(action)) {
      return new NextResponse(
        htmlPage({
          title: "Unknown action",
          body: "Use Confirm or Cancel from the WhatsApp message.",
          ok: false,
        }),
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

    const isConfirm = action === "confirm";
    const formHtml = `
      <form method="POST" action="?action=${encodeURIComponent(action)}&t=${encodeURIComponent(token)}" class="actions">
        <button type="submit" class="${isConfirm ? "btn-primary" : "btn-danger"}">
          ${isConfirm ? "Yes, confirm order" : "Yes, cancel order"}
        </button>
        <a class="btn btn-muted" href="about:blank" onclick="window.close();return false;">Close</a>
      </form>
      <p style="margin-top:16px;font-size:12px;color:#94a3b8">This page does nothing until you press the button. Login is not required for this one-time signed action.</p>
    `;

    return new NextResponse(
      htmlPage({
        title: isConfirm ? "Confirm this order?" : "Cancel this order?",
        body: isConfirm
          ? "Tap the green button only if you want to mark this order as confirmed."
          : "Tap the red button only if you want to cancel this order.",
        ok: true,
        formHtml,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Robots-Tag": "noindex, nofollow",
        },
      }
    );
  } catch (error) {
    return new NextResponse(
      htmlPage({
        title: "Something went wrong",
        body: error.message || "Could not open action page.",
        ok: false,
      }),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}

/** POST: human confirmed — apply status change. */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const parsed = parseActionRequest(request, id);
    const result = await applyWaAction(parsed);
    return new NextResponse(
      htmlPage({ title: result.title, body: result.body, ok: result.ok }),
      {
        status: result.status,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Robots-Tag": "noindex, nofollow",
        },
      }
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
