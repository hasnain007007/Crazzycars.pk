import { NextResponse } from "next/server";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { requestIp } from "@/lib/requestIp";
import { revalidateStorefront } from "@/lib/revalidateStorefront";
import { sanitizeSettingsDocument } from "@/lib/sanitizeForeignBrand";

function mergeNested(target, patch) {
  if (!patch || typeof patch !== "object") return;
  for (const key of Object.keys(patch)) {
    if (patch[key] != null && typeof patch[key] === "object" && !Array.isArray(patch[key]) && !(patch[key] instanceof Date)) {
      if (!target[key]) target[key] = {};
      mergeNested(target[key], patch[key]);
    } else {
      target[key] = patch[key];
    }
  }
}

/** Admin saves href; storefront may read url — keep both in sync. */
function normalizeFooterLinkArrays(footer) {
  if (!footer || typeof footer !== "object") return footer;
  for (const key of ["shopLinks", "customerCareLinks"]) {
    if (!Array.isArray(footer[key])) continue;
    footer[key] = footer[key].map((link) => {
      if (!link || typeof link !== "object") return link;
      const url = String(link.url || link.href || "").trim();
      const href = String(link.href || link.url || "").trim();
      const path = url || href;
      return { ...link, url: path, href: path };
    });
  }
  return footer;
}

export async function GET(request) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    let doc = await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY });
    if (!doc) {
      doc = await Settings.create({ singletonKey: SETTINGS_SINGLETON_KEY });
    }
    const settings = sanitizeSettingsDocument(doc.toObject());
    return NextResponse.json({
      success: true,
      settings,
      data: settings,
      general: settings.general || {},
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load settings." },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canManageSettings");
    if (denied) return denied;
    await dbConnect();
    let doc = await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY });
    if (!doc) {
      doc = await Settings.create({ singletonKey: SETTINGS_SINGLETON_KEY });
    }
    const body = await request.json();
    if (body.general) {
      if (!doc.general) doc.set("general", {});
      mergeNested(doc.general, body.general);
    }
    if (body.notifications) mergeNested(doc.notifications, body.notifications);
    if (body.invoice !== undefined && body.invoice !== null && typeof body.invoice === "object") {
      if (!doc.invoice) doc.set("invoice", {});
      mergeNested(doc.invoice, body.invoice);
      doc.markModified("invoice");
    }
    if (body.payment !== undefined) {
      if (!doc.payment) doc.payment = {};
      mergeNested(doc.payment, body.payment);
      doc.markModified("payment");
    }
    if (body.pakistaniPaymentMethods !== undefined) {
      if (!doc.pakistaniPaymentMethods) doc.set("pakistaniPaymentMethods", {});
      mergeNested(doc.pakistaniPaymentMethods, body.pakistaniPaymentMethods);
      doc.markModified("pakistaniPaymentMethods");
    }
    if (body.storePayment !== undefined) {
      if (!doc.storePayment) doc.set("storePayment", {});
      mergeNested(doc.storePayment, body.storePayment);
      // Policy: no free delivery — always strip free-shipping flags on save.
      doc.storePayment.freeShippingThreshold = 0;
      doc.storePayment.freeShippingOnAdvancePayment = false;
      doc.storePayment.freeShippingOnOrderAbove = 0;
      doc.storePayment.freeShippingOnOrderAboveEnabled = false;
      doc.storePayment.flatDeliveryCharge = 250;
      doc.storePayment.codFee = 0;
      if (
        !doc.storePayment.advancePaymentMessageTitle ||
        /pay delivery charges to confirm/i.test(String(doc.storePayment.advancePaymentMessageTitle || ""))
      ) {
        doc.storePayment.advancePaymentMessageTitle = "Confirm Your Order";
      }
      doc.markModified("storePayment");
    }
    if (body.courier !== undefined) {
      if (!doc.courier) doc.set("courier", {});
      mergeNested(doc.courier, body.courier);
      doc.markModified("courier");
    }
    if (body.seo !== undefined && body.seo !== null && typeof body.seo === "object") {
      if (!doc.seo) doc.set("seo", {});
      mergeNested(doc.seo, body.seo);
      doc.markModified("seo");
    }
    if (body.emailTemplates) mergeNested(doc.emailTemplates, body.emailTemplates);
    if (body.footer) {
      normalizeFooterLinkArrays(body.footer);
      if (!doc.footer) doc.set("footer", {});
      mergeNested(doc.footer, body.footer);
      doc.markModified("footer");
    }
    if (body.storefront != null && typeof body.storefront === "object") {
      if (!doc.storefront) doc.storefront = {};
      mergeNested(doc.storefront, body.storefront);
    }
    if (body.orderNumber) {
      if (!doc.orderNumber) doc.orderNumber = {};
      mergeNested(doc.orderNumber, body.orderNumber);
    }
    if (body.aboutPage != null && typeof body.aboutPage === "object") {
      doc.aboutPage = body.aboutPage;
      doc.markModified("aboutPage");
    }
    if (body.contactPage !== undefined) {
      doc.contactPage = body.contactPage;
      doc.markModified("contactPage");
    }
    if (body.whatsapp !== undefined) {
      doc.whatsapp = body.whatsapp;
      doc.markModified("whatsapp");
    }
    if (body.whatsappTemplates !== undefined) {
      if (!doc.whatsappTemplates) doc.set("whatsappTemplates", {});
      mergeNested(doc.whatsappTemplates, body.whatsappTemplates);
      doc.markModified("whatsappTemplates");
    }
    if (body.announcementBar !== undefined) {
      doc.announcementBar = body.announcementBar;
      doc.markModified("announcementBar");
    }
    if (body.trustBadges !== undefined) {
      doc.trustBadges = body.trustBadges;
      doc.markModified("trustBadges");
    }
    if (body.brandStory !== undefined) {
      doc.brandStory = body.brandStory;
      doc.markModified("brandStory");
    }
    if (body.megaMenu !== undefined) {
      doc.megaMenu = body.megaMenu;
      doc.markModified("megaMenu");
    }
    if (body.productBadges !== undefined) {
      doc.productBadges = body.productBadges;
      doc.markModified("productBadges");
    }
    if (body.productImageWatermark !== undefined && body.productImageWatermark !== null) {
      if (!doc.productImageWatermark) doc.set("productImageWatermark", {});
      mergeNested(doc.productImageWatermark, body.productImageWatermark);
      doc.markModified("productImageWatermark");
    }
    if (body.checkout !== undefined) {
      doc.checkout = body.checkout;
      doc.markModified("checkout");
    }
    if (body.homepageSettings !== undefined) {
      doc.homepageSettings = body.homepageSettings;
      doc.markModified("homepageSettings");
    }
    doc.markModified("general");
    doc.markModified("notifications");
    doc.markModified("payment");
    doc.markModified("pakistaniPaymentMethods");
    doc.markModified("storePayment");
    doc.markModified("courier");
    doc.markModified("seo");
    doc.markModified("emailTemplates");
    doc.markModified("footer");
    doc.markModified("storefront");
    doc.markModified("orderNumber");
    if (body.whatsappTemplates !== undefined) {
      doc.markModified("whatsappTemplates");
    }
    const healed = sanitizeSettingsDocument(doc.toObject());
    for (const key of Object.keys(healed)) {
      if (key === "_id" || key === "__v" || key === "id") continue;
      doc.set(key, healed[key]);
      doc.markModified(key);
    }

    await doc.save();

    await logActivity({
      user: user.userId,
      userName: user.name || "Admin",
      action: "Settings updated",
      resource: "Settings",
      resourceId: SETTINGS_SINGLETON_KEY,
      type: "settings",
      ip: requestIp(request),
    });

    // Storefront caches settings for 60s; purge now so edits show immediately.
    const revalidated = await revalidateStorefront(["/", "/api/settings"]);

    return NextResponse.json({ success: true, settings: sanitizeSettingsDocument(doc.toObject()), revalidated });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Update failed." },
      { status: 500 }
    );
  }
}
