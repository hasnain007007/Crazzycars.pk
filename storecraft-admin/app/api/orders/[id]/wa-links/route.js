/**
 * Returns signed confirm/cancel URLs + product image list for admin WhatsApp alerts.
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Order from "@/lib/models/Order.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { buildWaActionUrl } from "@/lib/waActionToken";
import {
  DEFAULT_REVIEW_REQUEST_WHATSAPP_TEMPLATE,
  buildReviewRequestUrl,
  buildReviewRequestWhatsAppMessage,
} from "@/lib/reviewRequestToken";

export async function GET(request, { params }) {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid order id." }, { status: 400 });
    }

    await dbConnect();
    const [order, settings] = await Promise.all([
      Order.findById(id).select("items orderNumber customer shippingAddress orderStatus").lean(),
      Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY })
        .select("whatsappTemplates.reviewRequest")
        .lean()
        .then((doc) => doc || Settings.findOne({}).select("whatsappTemplates.reviewRequest").lean()),
    ]);
    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
    }

    const base =
      process.env.NEXT_PUBLIC_APP_URL ||
      request.headers.get("origin") ||
      `${request.nextUrl.protocol}//${request.nextUrl.host}`;

    const confirmUrl = buildWaActionUrl(base, id, "confirm");
    const cancelUrl = buildWaActionUrl(base, id, "cancel");
    const reviewUrl = buildReviewRequestUrl(base, id);
    const reviewTemplate =
      String(settings?.whatsappTemplates?.reviewRequest?.template || "").trim() ||
      DEFAULT_REVIEW_REQUEST_WHATSAPP_TEMPLATE;
    const reviewMessage = reviewUrl
      ? buildReviewRequestWhatsAppMessage(order, reviewUrl, reviewTemplate)
      : "";
    const productImages = (order.items || [])
      .map((i) => String(i.image || "").trim())
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      confirmUrl,
      cancelUrl,
      reviewUrl,
      reviewMessage,
      productImages,
      orderNumber: order.orderNumber || "",
      orderStatus: order.orderStatus || "",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to build WhatsApp links." },
      { status: 500 }
    );
  }
}
