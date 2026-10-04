/**
 * POST /api/mobile/v1/cart/quote
 * Validate items, compute prices from DB, estimate shipping & coupon.
 * Does NOT place an order. Returns quote with minOrderAmount + meetsMinOrder warning.
 *
 * Body:
 *   items: [{ productId, quantity, variantId?, matchedCombination? }]
 *   couponCode?: string
 *   shippingAddress?: { city, state, country }
 *   paymentMethod?: string (default "cod")
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";
import Coupon from "@/lib/models/Coupon.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import ShippingZone from "@/lib/models/Shipping.model";
import { effectiveUnitPrice } from "@/lib/storePricing";
import { roundRupees } from "@/lib/currency";
import { quoteShipping } from "@/lib/shippingZoneWeight";
import { applyShippingRules, normalizeShippingRules } from "@/lib/freeDelivery";
import { computeCouponDiscount } from "@/lib/couponCompute";
import { buildCodUnavailableMessage, productAllowsCod } from "@/lib/codEligibility";
import { toKg } from "@/lib/shippingEstimate";
import { mobileError } from "@/lib/mobile/response";
import { isOfflinePakistaniPayment, normalizePakistaniPaymentMethods } from "@/lib/pakistaniPaymentMethods";

export const dynamic = "force-dynamic";

function getItemPrice(p, item) {
  // Check combo matrix
  const mc = item.matchedCombination;
  if (mc && typeof mc === "object") {
    const combos = Array.isArray(p.variationCombinations) ? p.variationCombinations : [];
    let found = null;
    const id = mc._id ? String(mc._id) : "";
    if (id && mongoose.Types.ObjectId.isValid(id)) {
      found = combos.find((c) => String(c._id) === id);
    }
    if (!found && Array.isArray(mc.options) && mc.options.length) {
      const sortedMc = [...mc.options].map((o) => ({ name: String(o?.name || "").trim(), value: String(o?.value || "").trim() })).filter((o) => o.name && o.value).sort((a, b) => a.name.localeCompare(b.name));
      found = combos.find((c) => {
        const sortedC = [...(c.options || [])].map((o) => ({ name: String(o?.name || "").trim(), value: String(o?.value || "").trim() })).filter((o) => o.name && o.value).sort((a, b) => a.name.localeCompare(b.name));
        if (sortedC.length !== sortedMc.length) return false;
        return sortedC.every((x, i) => x.name === sortedMc[i].name && x.value === sortedMc[i].value);
      });
    }
    if (found) {
      const baseWeightKg = toKg(p.inventory?.weight, p.inventory?.weightUnit || "kg");
      const comboWeightRaw = Number(found.weight);
      const perUnitWeightKg = Number.isFinite(comboWeightRaw) && comboWeightRaw > 0
        ? toKg(comboWeightRaw, p.inventory?.weightUnit || "g")
        : baseWeightKg;
      const base = effectiveUnitPrice(p);
      const comboPrice = Number(found.price);
      const unitPrice = Number.isFinite(comboPrice) && comboPrice >= 0 ? comboPrice : base;
      return { unitPrice: roundRupees(unitPrice), perUnitWeightKg: Math.max(0, perUnitWeightKg), isBulky: p.isBulky === true };
    }
  }

  // Legacy variant
  const variantId = String(item.variantId || "").trim();
  if (variantId && mongoose.Types.ObjectId.isValid(variantId)) {
    const v = (p.variants || []).find((x) => String(x._id) === variantId);
    if (v) {
      const baseWeightKg = toKg(p.inventory?.weight, p.inventory?.weightUnit || "kg");
      const addKg = toKg(v.additionalShippingWeight, v.weightUnit || "kg");
      return {
        unitPrice: roundRupees(Math.max(0, Number(v.price) || 0)),
        perUnitWeightKg: Math.max(0, baseWeightKg + addKg),
        isBulky: p.isBulky === true,
      };
    }
  }

  // Base price
  const baseWeightKg = toKg(p.inventory?.weight, p.inventory?.weightUnit || "kg");
  return {
    unitPrice: roundRupees(effectiveUnitPrice(p)),
    perUnitWeightKg: baseWeightKg,
    isBulky: p.isBulky === true,
  };
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return mobileError("INVALID_BODY", "Request body must be valid JSON.", { status: 400 });
  }

  const itemsIn = Array.isArray(body.items) ? body.items : [];
  if (!itemsIn.length) {
    return mobileError("CART_EMPTY", "Cart is empty.", { status: 400 });
  }

  const couponCodeRaw = String(body.couponCode || "").trim().toUpperCase();
  const paymentMethod = isOfflinePakistaniPayment(String(body.paymentMethod || "cod").trim())
    ? String(body.paymentMethod || "cod").trim()
    : "cod";
  const city = String(body.shippingAddress?.city || "").trim();
  const province = String(body.shippingAddress?.state || body.shippingAddress?.province || "").trim();
  const country = String(body.shippingAddress?.country || "Pakistan").trim() || "Pakistan";

  await dbConnect();

  // Collect product IDs
  const productIds = [...new Set(
    itemsIn
      .map((i) => String(i.productId || "").trim())
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
  )];

  if (!productIds.length) {
    return mobileError("INVALID_ITEMS", "No valid product IDs in cart.", { status: 400 });
  }

  const products = await Product.find({
    _id: { $in: productIds },
    status: { $regex: /^active$/i },
  }).lean();

  const unavailableCount = productIds.length - products.length;
  if (unavailableCount > 0) {
    return mobileError("PRODUCT_UNAVAILABLE", "One or more products are unavailable.", { status: 400 });
  }

  const byId = new Map(products.map((p) => [String(p._id), p]));

  // Build line items
  const lineItems = [];
  let subtotal = 0;
  let totalWeightKg = 0;
  const warnings = [];
  const categoryIdSet = new Set();

  for (const item of itemsIn) {
    const pid = String(item.productId || "").trim();
    if (!mongoose.Types.ObjectId.isValid(pid)) continue;
    const p = byId.get(pid);
    if (!p) continue;
    const qty = Math.max(1, Math.min(99, parseInt(item.quantity, 10) || 1));
    (p.categories || []).forEach((c) => categoryIdSet.add(String(c)));

    const { unitPrice, perUnitWeightKg, isBulky } = getItemPrice(p, item);
    const lineTotal = roundRupees(unitPrice * qty);
    subtotal += lineTotal;
    totalWeightKg += perUnitWeightKg * qty;

    lineItems.push({
      productId: pid,
      name: p.name,
      slug: p.slug,
      image: p.media?.images?.find((i) => i.isMain)?.url || p.media?.images?.[0]?.url || "",
      unitPrice,
      quantity: qty,
      total: lineTotal,
      isBulky,
    });
  }

  subtotal = roundRupees(subtotal);

  // COD check — hard fail with the exact checkout message (surface at cart).
  let codAvailable = true;
  let codUnavailableMessage = null;
  if (paymentMethod === "cod") {
    const blocked = products.filter((p) => !productAllowsCod(p));
    if (blocked.length) {
      codAvailable = false;
      codUnavailableMessage = buildCodUnavailableMessage(blocked);
      return mobileError("COD_NOT_AVAILABLE", codUnavailableMessage, { status: 400 });
    }
  }

  // Coupon
  let discount = 0;
  let couponCode = "";
  let couponMessage = null;
  if (couponCodeRaw) {
    const coupon = await Coupon.findOne({ code: couponCodeRaw }).lean();
    const catIds = [...categoryIdSet];
    const r = computeCouponDiscount(coupon, subtotal, catIds);
    if (r.valid) {
      discount = r.discount;
      couponCode = couponCodeRaw;
    } else {
      couponMessage = "Coupon is not applicable or invalid.";
      warnings.push({ code: "COUPON_INVALID", message: couponMessage });
    }
  }

  const afterCoupon = Math.max(0, roundRupees(subtotal - discount));

  // Settings for min order + shipping rules
  const settingsDoc =
    (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
    (await Settings.findOne({}).lean());

  const storePayment = normalizeShippingRules(settingsDoc?.storePayment);
  const pakMethods = normalizePakistaniPaymentMethods(settingsDoc?.pakistaniPaymentMethods);

  // Min order (soft warning for quote; hard fail only on POST /orders)
  const minOrderAmount = Math.max(0, Number(settingsDoc?.storePayment?.minimumOrderAmount) || 0);
  const meetsMinOrder = minOrderAmount === 0 || afterCoupon >= minOrderAmount;
  if (!meetsMinOrder) {
    warnings.push({
      code: "MIN_ORDER_NOT_MET",
      message: `Minimum order is Rs.${minOrderAmount}. Add Rs.${roundRupees(minOrderAmount - afterCoupon)} more.`,
    });
  }

  // Shipping estimate (requires city for zone lookup; fallback to floor)
  const activeZones = await ShippingZone.find({ status: "active" }).sort({ sortOrder: 1 }).lean();
  const totalWeightGrams = Math.max(0, Math.round(totalWeightKg * 1000));
  const cartHasBulky = lineItems.some((l) => l.isBulky);

  let shippingCost = 0;
  let shippingEstimated = !city;

  if (city) {
    const quote = quoteShipping(activeZones, country, city, totalWeightGrams, afterCoupon, province);
    const rulesResult = applyShippingRules({
      baseDeliveryCharge: roundRupees(quote.shippingCost),
      zoneShippingCost: roundRupees(quote.shippingCost),
      cartTotal: afterCoupon,
      paymentMethod,
      zoneIsFree: Boolean(quote.isFree),
      storePayment,
      hasBulky: cartHasBulky,
    });
    shippingCost = roundRupees(rulesResult.shippingCost);
  } else {
    // Estimate from floor (no city provided)
    const { shippingFloorPKR: floorFn } = await import("@/lib/shippingTier");
    shippingCost = floorFn(cartHasBulky);
    shippingEstimated = true;
  }

  const total = Math.max(0, roundRupees(afterCoupon + shippingCost));

  // Enabled payment methods
  const enabledPaymentMethods = Object.entries(pakMethods)
    .filter(([, v]) => v?.enabled === true)
    .map(([key]) => key);

  return NextResponse.json({
    items: lineItems,
    subtotal,
    discount,
    couponCode,
    afterCoupon,
    shippingCost,
    shippingEstimated,
    total,
    totalWeightGrams,
    hasBulky: cartHasBulky,
    minOrderAmount,
    meetsMinOrder,
    codAvailable,
    codUnavailableMessage,
    enabledPaymentMethods,
    warnings: warnings.length ? warnings : undefined,
    currency: "PKR",
  });
}
