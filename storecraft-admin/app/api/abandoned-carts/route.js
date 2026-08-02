/**
 * GET /api/abandoned-carts/route.js — remove bad cross-app import
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessMinRole } from "@/lib/requireRole";
import CartSession from "@/lib/models/CartSession.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { serializeCartSession } from "@/lib/abandonedCart";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const user = await getRequestUser(request);
    const denied = denyUnlessMinRole(user, "staff");
    if (denied) return denied;

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const status = String(searchParams.get("status") || "abandoned").trim();
    const q = String(searchParams.get("q") || "").trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (status && status !== "all") filter.status = status;
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { "customer.name": rx },
        { "customer.email": rx },
        { "customer.phone": rx },
        { sessionId: rx },
      ];
    }

    const [rows, total, statsAgg] = await Promise.all([
      CartSession.find(filter).sort({ lastActivityAt: -1 }).skip(skip).limit(limit).lean(),
      CartSession.countDocuments(filter),
      CartSession.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            value: { $sum: "$subtotal" },
          },
        },
      ]),
    ]);

    const stats = { active: 0, abandoned: 0, recovered: 0, dismissed: 0, abandonedValue: 0 };
    for (const row of statsAgg) {
      const key = row._id;
      if (key && key in stats) stats[key] = row.count;
      if (key === "abandoned") stats.abandonedValue = Math.round((row.value || 0) * 100) / 100;
    }

    const settingsDoc =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY })
        .select("abandonedCart notifications.emailAbandonedCart")
        .lean()) || null;

    return NextResponse.json({
      success: true,
      carts: rows.map(serializeCartSession),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      stats,
      settings: {
        ...(settingsDoc?.abandonedCart || {}),
        emailAbandonedCart: settingsDoc?.notifications?.emailAbandonedCart !== false,
      },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed" }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const user = await getRequestUser(request);
    const denied = denyUnlessMinRole(user, "staff");
    if (denied) return denied;

    const body = await request.json().catch(() => ({}));
    await dbConnect();

    if (body.settings && typeof body.settings === "object") {
      const s = body.settings;
      await Settings.findOneAndUpdate(
        { singletonKey: SETTINGS_SINGLETON_KEY },
        {
          $set: {
            "abandonedCart.enabled": s.enabled !== false,
            "abandonedCart.abandonAfterMinutes": Math.max(15, Number(s.abandonAfterMinutes) || 60),
            "abandonedCart.maxEmailReminders": Math.max(0, Math.min(5, Number(s.maxEmailReminders) ?? 2)),
            "abandonedCart.reminderIntervalHours": Math.max(1, Number(s.reminderIntervalHours) || 24),
            "notifications.emailAbandonedCart": s.emailAbandonedCart !== false,
          },
        },
        { upsert: true }
      );
      return NextResponse.json({ success: true, saved: "settings" });
    }

    const id = String(body.id || "").trim();
    const action = String(body.action || "").trim();
    if (!id || !action) {
      return NextResponse.json({ success: false, error: "id and action required" }, { status: 400 });
    }

    const doc = await CartSession.findById(id);
    if (!doc) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    if (action === "dismiss") {
      doc.status = "dismissed";
      await doc.save();
    } else if (action === "reopen") {
      doc.status = "abandoned";
      doc.abandonedAt = doc.abandonedAt || new Date();
      await doc.save();
    } else if (action === "mark-recovered") {
      doc.status = "recovered";
      doc.recoveredAt = new Date();
      await doc.save();
    } else if (action === "log-whatsapp") {
      doc.reminders.push({
        channel: "whatsapp",
        sentAt: new Date(),
        status: "sent",
        note: "Opened WhatsApp from admin",
      });
      await doc.save();
    } else {
      return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
    }

    return NextResponse.json({ success: true, cart: serializeCartSession(doc) });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed" }, { status: 500 });
  }
}
