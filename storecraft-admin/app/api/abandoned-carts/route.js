/**
 * GET /api/abandoned-carts/route.js — remove bad cross-app import
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import CartSession from "@/lib/models/CartSession.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { markIdleCartsAbandoned, serializeCartSession } from "@/lib/abandonedCart";
import { phoneForStorage } from "@/lib/pkPhone";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const user = await getRequestUser(request);
    const denied = denyUnlessCapability(user, "canManageOrders");
    if (denied) return denied;

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const status = String(searchParams.get("status") || "abandoned").trim();
    const q = String(searchParams.get("q") || "").trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
    const skip = (page - 1) * limit;

    // Promote idle active carts so the Abandoned tab works without relying on Coolify cron alone.
    const settingsForMark =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY })
        .select("abandonedCart")
        .lean()) || null;
    if (settingsForMark?.abandonedCart?.enabled !== false) {
      await markIdleCartsAbandoned(CartSession, {
        abandonAfterMinutes: settingsForMark?.abandonedCart?.abandonAfterMinutes,
      }).catch((err) => console.error("[abandoned-carts] markIdle:", err?.message || err));
    }

    const filter = {};
    if (status && status !== "all") filter.status = status;
    // Active / Abandoned: only carts with ≥1 item (empty sync rows are noise).
    if (status === "active" || status === "abandoned") filter.itemCount = { $gt: 0 };
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { "customer.name": rx },
        { "customer.email": rx },
        { "customer.phone": rx },
        { "shippingAddress.street": rx },
        { "shippingAddress.city": rx },
        { "shippingAddress.state": rx },
        { "shippingAddress.phone": rx },
        { "shippingAddress.name": rx },
        { customerId: rx },
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
            count: {
              $sum: {
                $cond: [
                  {
                    $or: [{ $ne: ["$status", "active"] }, { $gt: ["$itemCount", 0] }],
                  },
                  1,
                  0,
                ],
              },
            },
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
    const denied = denyUnlessCapability(user, "canManageOrders");
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
    } else if (action === "set-contact") {
      // Allow staff to attach phone/email/address for guest carts so recover + convert work.
      doc.customer = doc.customer || {};
      doc.shippingAddress = doc.shippingAddress || {};
      if (body.phone != null) {
        const stored = phoneForStorage(body.phone);
        if (stored.phone) {
          doc.customer.phone = stored.phone;
          doc.customer.phoneValid = Boolean(stored.phoneValid);
          doc.customer.phoneRaw = stored.phoneRaw || "";
          doc.shippingAddress.phone = stored.phone;
        }
      }
      if (body.email != null) {
        const email = String(body.email || "").trim().toLowerCase();
        if (email && email.includes("@")) {
          doc.customer.email = email;
          doc.shippingAddress.email = email;
        }
      }
      if (body.name != null) {
        const name = String(body.name || "").trim();
        if (name) {
          doc.customer.name = name;
          doc.shippingAddress.name = name;
        }
      }
      if (body.street != null || body.address != null) {
        const street = String(body.street || body.address || "").trim();
        if (street) doc.shippingAddress.street = street;
      }
      if (body.city != null) {
        const city = String(body.city || "").trim();
        if (city) doc.shippingAddress.city = city;
      }
      if (body.state != null || body.province != null) {
        const state = String(body.state || body.province || "").trim();
        if (state) doc.shippingAddress.state = state;
      }
      if (body.zip != null) {
        const zip = String(body.zip || "").trim();
        if (zip) doc.shippingAddress.zip = zip;
      }
      doc.markModified("customer");
      doc.markModified("shippingAddress");
      await doc.save();
    } else {
      return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
    }

    return NextResponse.json({ success: true, cart: serializeCartSession(doc) });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed" }, { status: 500 });
  }
}
