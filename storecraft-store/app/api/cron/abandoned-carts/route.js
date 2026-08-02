/**
 * GET /api/cron/abandoned-carts — mark idle carts abandoned + send email reminders.
 * Auth: Authorization: Bearer $CRON_SECRET
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import CartSession from "@/lib/models/CartSession.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { sendEmail } from "@/lib/email";
import {
  buildAbandonedCartEmail,
  hasContact,
  resolveAbandonedCartSettings,
} from "@/lib/abandonedCart";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function resolveCronSecret() {
  return String(process.env.CRON_SECRET || process.env.REVALIDATE_SECRET || "").trim();
}

function authorized(request) {
  const secret = resolveCronSecret();
  if (!secret) return false;
  const header = request.headers.get("authorization") || "";
  return header === `Bearer ${secret}`;
}

export async function GET(request) {
  try {
    if (!authorized(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const cfg = await resolveAbandonedCartSettings(Settings, SETTINGS_SINGLETON_KEY);
    if (cfg.enabled === false) {
      return NextResponse.json({ success: true, skipped: true, reason: "disabled" });
    }

    const abandonMs = Math.max(15, Number(cfg.abandonAfterMinutes) || 60) * 60 * 1000;
    const reminderMs = Math.max(1, Number(cfg.reminderIntervalHours) || 24) * 60 * 60 * 1000;
    const maxReminders = Math.max(0, Math.min(5, Number(cfg.maxEmailReminders) ?? 2));
    const cutoff = new Date(Date.now() - abandonMs);
    const now = new Date();

    // 1) Mark idle carts with contact info as abandoned
    const markResult = await CartSession.updateMany(
      {
        status: "active",
        itemCount: { $gt: 0 },
        lastActivityAt: { $lte: cutoff },
        $or: [
          { "customer.email": { $regex: /.+@.+/ } },
          { "customer.phone": { $regex: /\d{10,}/ } },
        ],
      },
      {
        $set: { status: "abandoned", abandonedAt: now },
      }
    );

    // 2) Send email reminders
    let emailsSent = 0;
    let emailsFailed = 0;
    let emailsSkipped = 0;

    if (cfg.emailEnabled !== false && maxReminders > 0) {
      const candidates = await CartSession.find({
        status: "abandoned",
        itemCount: { $gt: 0 },
        emailReminderCount: { $lt: maxReminders },
        "customer.email": { $regex: /.+@.+/ },
        $or: [
          { lastEmailReminderAt: null },
          { lastEmailReminderAt: { $lte: new Date(Date.now() - reminderMs) } },
        ],
      })
        .sort({ abandonedAt: 1 })
        .limit(40);

      for (const cart of candidates) {
        const email = String(cart.customer?.email || "").trim().toLowerCase();
        if (!email.includes("@") || email.startsWith("guest+")) {
          emailsSkipped += 1;
          continue;
        }
        if (!hasContact(cart.customer)) {
          emailsSkipped += 1;
          continue;
        }

        const { subject, html } = buildAbandonedCartEmail({
          cart,
          storeName: cfg.storeName,
          storePhone: cfg.storePhone,
        });

        const result = await sendEmail({ to: email, subject, html });
        if (result?.success) {
          cart.emailReminderCount = (cart.emailReminderCount || 0) + 1;
          cart.lastEmailReminderAt = new Date();
          cart.reminders.push({
            channel: "email",
            sentAt: new Date(),
            status: "sent",
            note: `reminder #${cart.emailReminderCount}`,
          });
          emailsSent += 1;
        } else {
          cart.reminders.push({
            channel: "email",
            sentAt: new Date(),
            status: "failed",
            note: String(result?.error || "send failed"),
          });
          emailsFailed += 1;
        }
        await cart.save();
      }
    }

    return NextResponse.json({
      success: true,
      markedAbandoned: markResult.modifiedCount || 0,
      emailsSent,
      emailsFailed,
      emailsSkipped,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Cron failed." },
      { status: 500 }
    );
  }
}
