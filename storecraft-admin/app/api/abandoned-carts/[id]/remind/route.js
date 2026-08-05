/**
 * POST /api/abandoned-carts/[id]/remind — send recovery email now.
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessMinRole } from "@/lib/requireRole";
import CartSession from "@/lib/models/CartSession.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { sendEmail } from "@/lib/email";
import { serializeCartSession } from "@/lib/abandonedCart";
import { buildAbandonedCartEmailHtml } from "@/lib/abandonedCartEmail";

export const dynamic = "force-dynamic";

export async function POST(request, context) {
  try {
    const user = await getRequestUser(request);
    const denied = denyUnlessMinRole(user, "editor");
    if (denied) return denied;

    const { id } = await context.params;
    await dbConnect();
    const doc = await CartSession.findById(id);
    if (!doc) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const email = String(doc.customer?.email || "").trim().toLowerCase();
    if (!email.includes("@") || email.startsWith("guest+")) {
      return NextResponse.json(
        { success: false, error: "This cart has no real email address." },
        { status: 400 }
      );
    }

    const settings =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY })
        .select("general")
        .lean()) || {};
    const storeName = settings?.general?.storeName || "Crazzycars.pk";
    const storePhone = settings?.general?.phone || "";

    const { subject, html } = buildAbandonedCartEmailHtml(doc, { storeName, storePhone });
    const result = await sendEmail({ to: email, subject, html });
    if (!result?.success) {
      doc.reminders.push({
        channel: "email",
        sentAt: new Date(),
        status: "failed",
        note: String(result?.error || "failed"),
      });
      await doc.save();
      return NextResponse.json(
        { success: false, error: result?.error || "Email failed" },
        { status: 500 }
      );
    }

    doc.emailReminderCount = (doc.emailReminderCount || 0) + 1;
    doc.lastEmailReminderAt = new Date();
    if (doc.status === "active") {
      doc.status = "abandoned";
      doc.abandonedAt = doc.abandonedAt || new Date();
    }
    doc.reminders.push({
      channel: "email",
      sentAt: new Date(),
      status: "sent",
      note: "manual admin send",
    });
    await doc.save();

    return NextResponse.json({ success: true, cart: serializeCartSession(doc) });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed" }, { status: 500 });
  }
}
