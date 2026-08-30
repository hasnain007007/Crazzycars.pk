import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { allocateOrderNumber } from "@/lib/orderNumber";
import { dbConnect } from "@/lib/db";
import Coupon from "@/lib/models/Coupon.model";
import Customer from "@/lib/models/Customer.model";
import Order from "@/lib/models/Order.model";
import Product from "@/lib/models/Product.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import ShippingZone from "@/lib/models/Shipping.model";
import { computeCouponDiscount } from "@/lib/couponCompute";
import { sendAdminOrderNotification, sendCustomerOrderConfirmation } from "@/lib/email";
import {
  applyShippingRules,
  buildAdvancePaymentOrderNote,
  computeAdvancePaymentDiscount,
  normalizeShippingRules,
  storePolicyWhatsApp,
} from "@/lib/freeDelivery";
import { productAllowsCod } from "@/lib/codEligibility";
import { computeCodAdvanceDue } from "@/lib/productAdvance";
import {
  isOfflinePakistaniPayment,
  normalizePakistaniPaymentMethods,
} from "@/lib/pakistaniPaymentMethods";
import { quoteShipping } from "@/lib/shippingZoneWeight";
import { toKg } from "@/lib/shippingEstimate";
import { effectiveUnitPrice } from "@/lib/storePricing";
import { allowsBackorder } from "@/lib/inventoryPolicy";
import { readAiAttributionFromRequest } from "@/lib/aiAttribution";
import CartSession from "@/lib/models/CartSession.model";
import {
  actionRateLimitKey,
  checkActionRateLimit,
  rateLimitResponse,
  recordActionAttempt,
} from "@/lib/actionRateLimit";
import { requestIp } from "@/lib/requestIp";

const CHECKOUT_RATE = { maxAttempts: 5, windowMs: 10 * 60 * 1000 };

function isValidCustomerEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  return Boolean(e) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && !e.endsWith("@guest.checkout");
}

/** Guest checkout placeholder — satisfies Customer schema when email omitted. */
function guestEmailForPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  return `guest+${digits}@guest.checkout`;
}

function aggregateInventoryNeeds(items) {
  const byProduct = new Map();
  const byVariant = new Map();
  for (const it of items) {
    const id = String(it.productId || "").trim();
    if (!mongoose.Types.ObjectId.isValid(id)) continue;
    const q = Math.max(1, Math.min(99, parseInt(it.quantity, 10) || 1));
    const vid = String(it.variantId || "").trim();
    if (vid && mongoose.Types.ObjectId.isValid(vid)) {
      const k = `${id}::${vid}`;
      byVariant.set(k, (byVariant.get(k) || 0) + q);
    } else {
      byProduct.set(id, (byProduct.get(id) || 0) + q);
    }
  }
  return { byProduct, byVariant };
}

function productHasComboMatrix(p) {
  return (
    Array.isArray(p?.variationCombinations) &&
    p.variationCombinations.length > 0 &&
    (p.simpleVariations || []).some((v) => v?.enabled && Array.isArray(v.tags) && v.tags.length > 0)
  );
}

/** True when cart lines for this product are stocked via variationCombinations, not base inventory. */
function usesComboInventory(p, itemsIn, pid) {
  if (!productHasComboMatrix(p)) return false;
  const lines = (itemsIn || []).filter((it) => String(it.productId || "").trim() === pid);
  if (!lines.length) return false;
  return lines.every((raw) => Boolean(resolveCombinationFromCart(p, raw)?._id));
}

function normalizeMeasurements(raw) {
  if (!raw || typeof raw !== "object") return {};
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = String(k || "").trim();
    const value = String(v || "").trim();
    if (!key || !value) continue;
    out[key] = value;
  }
  return out;
}

function normalizeSelectedVariation(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (Array.isArray(raw.choices) && raw.choices.length) {
    const choices = raw.choices
      .map((c) => {
        if (!c || typeof c !== "object") return null;
        const optionValue = String(c.optionValue || "").trim();
        if (!optionValue) return null;
        const stockRaw = c.stock;
        let stock;
        if (stockRaw !== "" && stockRaw != null && Number.isFinite(Number(stockRaw))) {
          stock = Math.max(0, Number(stockRaw));
        }
        return {
          variationId: String(c.variationId || "").trim(),
          variationName: String(c.variationName || "").trim(),
          optionValue,
          additionalPrice: Math.max(0, Number(c.additionalPrice) || 0),
          optionWeight: Math.max(0, Number(c.optionWeight) || 0),
          weightUnit: String(c.weightUnit || "kg").trim(),
          additionalShippingWeight: Math.max(0, Number(c.additionalShippingWeight) || 0),
          shippingWeightUnit: String(c.shippingWeightUnit || "kg").trim(),
          shippingPriceSurcharge: Math.max(0, Number(c.shippingPriceSurcharge) || 0),
          sku: String(c.sku || "").trim(),
          ...(stock !== undefined ? { stock } : {}),
        };
      })
      .filter(Boolean);
    return { choices, label: String(raw.label || raw.name || "").trim().slice(0, 400) };
  }
  return {
    name: String(raw.name || "").trim(),
    type: String(raw.type || "").trim(),
    options: Array.isArray(raw.options) ? raw.options.map((v) => String(v || "").trim()).filter(Boolean) : [],
    weight: Math.max(0, Number(raw.weight) || 0),
    additionalShippingWeight: Math.max(0, Number(raw.additionalShippingWeight) || 0),
    shippingPriceSurcharge: Math.max(0, Number(raw.shippingPriceSurcharge) || 0),
  };
}

function getOrderWeight(items) {
  return items.reduce((total, item) => {
    const baseWeight = Number(item.shipping?.weight ?? item.weight ?? 0);
    const matchedWeight = Number(item.matchedCombination?.weight);
    const itemWeight = Number.isFinite(matchedWeight) ? matchedWeight : baseWeight;
    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
    return total + itemWeight * qty;
  }, 0);
}

function findOptionOnProduct(p, choice) {
  const want = String(choice?.optionValue || "").trim();
  if (!want) return null;
  const vid = String(choice?.variationId || "").trim();
  const nm = String(choice?.variationName || "").trim();
  let v = (p.variations || []).find((x) => String(x._id) === vid);
  if (!v && nm) {
    v = (p.variations || []).find(
      (x) => String(x.name || "").trim() === nm || String(x.type || "").trim() === nm
    );
  }
  if (!v) return null;
  const opts = v.options || [];
  const opt = opts.find((o) => (typeof o === "string" ? o === want : String(o?.value) === want));
  if (typeof opt === "string") {
    return {
      value: opt,
      additionalPrice: 0,
      weight: 0,
      weightUnit: "kg",
      additionalShippingWeight: 0,
      shippingWeightUnit: "kg",
      shippingPriceSurcharge: 0,
    };
  }
  return opt && typeof opt === "object" ? opt : null;
}

function findVariantOnProduct(p, variantId) {
  const vid = String(variantId || "").trim();
  if (!vid || !mongoose.Types.ObjectId.isValid(vid)) return null;
  return (p.variants || []).find((x) => String(x._id) === vid) || null;
}

function legacyVariantsLength(p) {
  const v = p?.variants;
  return Array.isArray(v) ? v.length : 0;
}

function normalizeComboOptions(opts) {
  if (!Array.isArray(opts)) return [];
  return [...opts]
    .map((o) => ({
      name: String(o?.name ?? "").trim(),
      value: String(o?.value ?? "").trim(),
    }))
    .filter((o) => o.name && o.value)
    .sort((a, b) => a.name.localeCompare(b.name) || a.value.localeCompare(b.value));
}

function combinationsOptionsMatch(comboOpts, mcOpts) {
  const A = normalizeComboOptions(comboOpts);
  const B = normalizeComboOptions(mcOpts);
  if (A.length !== B.length || A.length === 0) return false;
  for (let i = 0; i < A.length; i++) {
    if (A[i].name !== B[i].name || A[i].value !== B[i].value) return false;
  }
  return true;
}

/** Resolve variationCombinations row from cart payload (matchedCombination). */
function resolveCombinationFromCart(p, raw) {
  const combos = p.variationCombinations || [];
  if (!Array.isArray(combos) || combos.length === 0) return null;

  const mc = raw.matchedCombination;
  if (mc && typeof mc === "object") {
    const id = mc._id != null ? String(mc._id) : "";
    if (id && mongoose.Types.ObjectId.isValid(id)) {
      const found = combos.find((c) => String(c._id) === id);
      if (found) return found;
    }
    const mcOpts = mc.options;
    if (Array.isArray(mcOpts) && mcOpts.length > 0) {
      const found = combos.find((c) => combinationsOptionsMatch(c.options || [], mcOpts));
      if (found) return found;
    }
  }

  // Fallback: selectedOptions [{name,value}] from product page
  const selectedOpts = Array.isArray(raw.selectedOptions) ? raw.selectedOptions : null;
  if (selectedOpts?.length) {
    const found = combos.find((c) => combinationsOptionsMatch(c.options || [], selectedOpts));
    if (found) return found;
  }

  // Fallback: parse "Style: Neon LED, Color: Red" variationLabel
  const label = String(raw.variationLabel || "").trim();
  if (label) {
    const parsed = label
      .split(",")
      .map((part) => {
        const idx = part.indexOf(":");
        if (idx < 0) return null;
        const name = part.slice(0, idx).trim();
        const value = part.slice(idx + 1).trim();
        if (!name || !value) return null;
        return { name, value };
      })
      .filter(Boolean);
    if (parsed.length) {
      const found = combos.find((c) => combinationsOptionsMatch(c.options || [], parsed));
      if (found) return found;
    }
  }

  return null;
}

/** Cart line indicates options were chosen (simple variations, combos, or legacy variation payload). */
function cartHasModernSelection(raw) {
  const mc = raw.matchedCombination;
  if (mc && typeof mc === "object") {
    if (Array.isArray(mc.options) && mc.options.length > 0) return true;
    const id = mc._id != null ? String(mc._id) : "";
    if (id.trim()) return true;
    if (Number.isFinite(Number(mc.price))) return true;
    if (Number.isFinite(Number(mc.stock))) return true;
  }
  if (String(raw.variationLabel || "").trim()) return true;
  if (Array.isArray(raw.selectedOptions) && raw.selectedOptions.length > 0) return true;
  const sv = normalizeSelectedVariation(raw.selectedVariation);
  if (sv?.choices?.length) return true;
  return false;
}

function variationLabelFromCombo(combo) {
  const opts = Array.isArray(combo?.options) ? combo.options : [];
  return opts
    .map((o) => `${String(o?.name || "").trim()}: ${String(o?.value || "").trim()}`)
    .filter((s) => s !== ":")
    .join(", ");
}

function lineUnitPriceAndShipping(p, raw, selectedVariation) {
  const variantId = String(raw.variantId || "").trim();
  if (variantId && mongoose.Types.ObjectId.isValid(variantId)) {
    const v = findVariantOnProduct(p, variantId);
    if (v) {
      const baseWeightKg = toKg(p.inventory?.weight, p.inventory?.weightUnit || "kg");
      const addKg = toKg(v.additionalShippingWeight, v.weightUnit || "kg");
      const unitPrice = Math.max(0, Number(v.price) || 0);
      return {
        unitPrice: Math.round(unitPrice * 100) / 100,
        perUnitWeightKg: Math.max(0, baseWeightKg + addKg),
        surcharge: Math.max(0, Number(v.shippingPriceSurcharge) || 0),
        variant: v,
        combo: null,
      };
    }
  }

  // Style / Size matrix (simpleVariations + variationCombinations) — price from DB combo only.
  const resolvedCombo = resolveCombinationFromCart(p, raw);
  if (resolvedCombo) {
    const base = effectiveUnitPrice(p);
    const comboPrice = Number(resolvedCombo.price);
    const unitPrice = Number.isFinite(comboPrice) && comboPrice >= 0 ? comboPrice : base;
    const baseWeightKg = toKg(p.inventory?.weight, p.inventory?.weightUnit || "kg");
    const comboWeightRaw = Number(resolvedCombo.weight);
    const perUnitWeightKg =
      Number.isFinite(comboWeightRaw) && comboWeightRaw > 0
        ? toKg(comboWeightRaw, p.inventory?.weightUnit || "g")
        : baseWeightKg;
    return {
      unitPrice: Math.round(unitPrice * 100) / 100,
      perUnitWeightKg: Math.max(0, perUnitWeightKg),
      surcharge: 0,
      variant: null,
      combo: resolvedCombo,
    };
  }

  const base = effectiveUnitPrice(p);
  const baseWeightKg = toKg(p.inventory?.weight, p.inventory?.weightUnit || "kg");
  // Never trust client unitPrice / shipping surcharge / weight — price from DB only.
  if (!selectedVariation) {
    return {
      unitPrice: Math.round(base * 100) / 100,
      perUnitWeightKg: baseWeightKg,
      surcharge: 0,
      variant: null,
      combo: null,
    };
  }
  if (selectedVariation?.choices?.length) {
    let optionAdd = 0;
    let addShipKg = 0;
    let surcharge = 0;
    for (const c of selectedVariation.choices) {
      const opt = findOptionOnProduct(p, c);
      if (opt) {
        optionAdd += Number(opt.additionalPrice) || 0;
        addShipKg += toKg(opt.additionalShippingWeight, opt.shippingWeightUnit || opt.weightUnit || "kg");
        surcharge += Number(opt.shippingPriceSurcharge) || 0;
      }
    }
    return {
      unitPrice: Math.round((base + optionAdd) * 100) / 100,
      perUnitWeightKg: Math.max(0, baseWeightKg + addShipKg),
      surcharge,
      variant: null,
      combo: null,
    };
  }
  const addShipKg = toKg(selectedVariation?.additionalShippingWeight ?? 0, "kg");
  const surcharge = Number(selectedVariation?.shippingPriceSurcharge) || 0;
  return {
    unitPrice: Math.round(base * 100) / 100,
    perUnitWeightKg: Math.max(0, baseWeightKg + addShipKg),
    surcharge,
    variant: null,
    combo: null,
  };
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json().catch(() => ({}));
    const aiAttribution = readAiAttributionFromRequest(request);
    const itemsIn = Array.isArray(body.items) ? body.items : [];
    if (!itemsIn.length) {
      return NextResponse.json({ success: false, error: "Cart is empty." }, { status: 400 });
    }

    const customerIn = body.customer || {};
    const name = String(customerIn.name || "").trim();
    const phoneRaw = String(customerIn.phone || "").trim();
    const emailInput = String(customerIn.email || "").trim().toLowerCase();
    const email = isValidCustomerEmail(emailInput) ? emailInput : "";
    if (!name) {
      return NextResponse.json({ success: false, error: "Name is required." }, { status: 400 });
    }
    if (!phoneRaw) {
      return NextResponse.json({ success: false, error: "Phone number is required." }, { status: 400 });
    }
    const phoneDigits = phoneRaw.replace(/\D/g, "");
    const phoneOk =
      /^03\d{9}$/.test(phoneDigits) ||
      /^923\d{9}$/.test(phoneDigits) ||
      /^3\d{9}$/.test(phoneDigits);
    if (!phoneOk) {
      return NextResponse.json(
        { success: false, error: "Enter a valid Pakistani mobile number (e.g. 03XX XXXXXXX)." },
        { status: 400 }
      );
    }
    const phone = phoneDigits.startsWith("923")
      ? `0${phoneDigits.slice(2)}`
      : phoneDigits.startsWith("3") && phoneDigits.length === 10
        ? `0${phoneDigits}`
        : phoneDigits;
    const customerRecordEmail = email || guestEmailForPhone(phone);
    if (!customerRecordEmail) {
      return NextResponse.json({ success: false, error: "Phone number is required." }, { status: 400 });
    }

    const checkoutLimitKey = actionRateLimitKey(
      "checkout",
      customerRecordEmail,
      requestIp(request)
    );
    const checkoutLimit = await checkActionRateLimit(checkoutLimitKey, CHECKOUT_RATE);
    if (checkoutLimit.limited) {
      return rateLimitResponse(
        checkoutLimit.remainingMs,
        "Too many checkout attempts. Please wait a few minutes and try again."
      );
    }
    // Count only successful placements (below) so stock/option retries do not lock shoppers out.

    const stateVal = String(body.shippingAddress?.state || body.shippingAddress?.province || "").trim();
    const streetVal = String(body.shippingAddress?.street || body.shippingAddress?.line1 || "").trim();
    const street2Val = String(body.shippingAddress?.street2 || body.shippingAddress?.line2 || "").trim();
    const areaVal = String(body.shippingAddress?.area || "").trim();
    const cityVal = String(body.shippingAddress?.city || "").trim();
    const zipVal = String(body.shippingAddress?.zip || body.shippingAddress?.postcode || "").trim();
    const shippingAddress = {
      name: String(body.shippingAddress?.name || name).trim(),
      phone: String(body.shippingAddress?.phone || phone).trim(),
      street: streetVal,
      street2: street2Val,
      line1: streetVal,
      line2: street2Val,
      address: [streetVal, street2Val].filter(Boolean).join(", "),
      area: areaVal,
      city: cityVal,
      state: stateVal,
      province: stateVal,
      country: String(body.shippingAddress?.country || "Pakistan").trim() || "Pakistan",
      zip: zipVal,
      postcode: zipVal,
      postalCode: zipVal,
      nif: String(body.shippingAddress?.nif || "").trim(),
    };
    if (!shippingAddress.street) {
      return NextResponse.json({ success: false, error: "Street address is required." }, { status: 400 });
    }
    if (!shippingAddress.city) {
      return NextResponse.json({ success: false, error: "City is required." }, { status: 400 });
    }
    if (!shippingAddress.state) {
      return NextResponse.json({ success: false, error: "Province is required." }, { status: 400 });
    }

    const requestedPaymentMethod = String(body.paymentMethod || "cod").trim();
    if (/^(stripe|paypal)$/i.test(requestedPaymentMethod)) {
      return NextResponse.json(
        { success: false, error: "Card and PayPal checkout are not available. Use Cash on Delivery or bank transfer." },
        { status: 400 }
      );
    }
    let paymentMethod = "cod";
    if (isOfflinePakistaniPayment(requestedPaymentMethod)) {
      paymentMethod = requestedPaymentMethod;
    }
    const paymentStatus = "unpaid";
    const initialStatus = "pending";

    const { byProduct, byVariant } = aggregateInventoryNeeds(itemsIn);
    const productIds = [
      ...new Set([...byProduct.keys(), ...[...byVariant.keys()].map((k) => k.split("::")[0])]),
    ];
    const products = await Product.find({
      _id: { $in: productIds },
      status: { $regex: /^active$/i },
    }).lean();
    if (products.length !== productIds.length) {
      return NextResponse.json({ success: false, error: "One or more products are unavailable." }, { status: 400 });
    }

    const byId = new Map(products.map((p) => [p._id.toString(), p]));

    if (paymentMethod === "cod") {
      const blocked = products.filter((p) => !productAllowsCod(p));
      if (blocked.length) {
        const names = blocked
          .slice(0, 3)
          .map((p) => p.name)
          .join(", ");
        const more = blocked.length > 3 ? ` (+${blocked.length - 3} more)` : "";
        return NextResponse.json(
          {
            success: false,
            error: `Cash on Delivery is not available for: ${names}${more}. Choose advance payment instead.`,
          },
          { status: 400 }
        );
      }
    }

    for (const [pid, need] of byProduct.entries()) {
      const p = byId.get(pid);
      if (!p) continue;
      if ((p.variants || []).length) continue;
      // Style/Size matrix stock lives on combinations — do not gate on base qty.
      if (usesComboInventory(p, itemsIn, pid)) continue;
      if (allowsBackorder(p)) continue;
      if (p.inventory?.trackInventory && (Number(p.inventory.quantity) || 0) < need) {
        return NextResponse.json(
          { success: false, error: `Insufficient stock for ${p.name}.` },
          { status: 400 }
        );
      }
    }
    for (const [key, need] of byVariant.entries()) {
      const [pid, vid] = key.split("::");
      const p = byId.get(pid);
      if (!p) continue;
      const v = findVariantOnProduct(p, vid);
      if (!v || v.isAvailable === false) {
        return NextResponse.json(
          { success: false, error: `Variant unavailable for ${p?.name || "product"}.` },
          { status: 400 }
        );
      }
      if (allowsBackorder(p)) continue;
      if (v.trackStock !== false && (Number(v.stock) || 0) < need) {
        return NextResponse.json(
          { success: false, error: `Insufficient stock for ${p.name} (${(v.combination || []).join(" / ")}).` },
          { status: 400 }
        );
      }
    }

    const lineItems = [];
    let subtotal = 0;
    let totalOrderWeightKg = 0;
    let totalSurcharge = 0;
    const categoryIdSet = new Set();

    for (const raw of itemsIn) {
      const pid = String(raw.productId || "").trim();
      if (!mongoose.Types.ObjectId.isValid(pid)) continue;
      const p = byId.get(pid);
      if (!p) continue;
      const qty = Math.max(1, Math.min(99, parseInt(raw.quantity, 10) || 1));
      (p.categories || []).forEach((c) => categoryIdSet.add(String(c)));
      const hasLegacyVariants = legacyVariantsLength(p) > 0;
      const hasComboMatrix =
        Array.isArray(p.variationCombinations) &&
        p.variationCombinations.length > 0 &&
        (p.simpleVariations || []).some((v) => v?.enabled && Array.isArray(v.tags) && v.tags.length > 0);
      const variantIdStr = String(raw.variantId || "").trim();
      const variantDoc =
        variantIdStr && mongoose.Types.ObjectId.isValid(variantIdStr)
          ? findVariantOnProduct(p, variantIdStr)
          : null;
      const modernPick = cartHasModernSelection(raw);
      const resolvedCombo = resolveCombinationFromCart(p, raw);

      // Style/Size matrix products must resolve a combination — never fall back to base salePrice.
      if (hasComboMatrix && !resolvedCombo) {
        return NextResponse.json(
          {
            success: false,
            error: `Please select options for "${p.name}" before checkout.`,
          },
          { status: 400 }
        );
      }
      if (hasComboMatrix && resolvedCombo && p.inventory?.trackInventory !== false && !allowsBackorder(p)) {
        const cs = resolvedCombo.stock;
        if (cs !== undefined && cs !== null && Number.isFinite(Number(cs)) && Number(cs) < qty) {
          return NextResponse.json(
            {
              success: false,
              error: `Insufficient stock for "${p.name}" for the selected options.`,
            },
            { status: 400 }
          );
        }
      }

      if (hasLegacyVariants && !variantDoc) {
        if (resolvedCombo) {
          if (p.inventory?.trackInventory !== false && !allowsBackorder(p)) {
            const cs = resolvedCombo.stock;
            if (cs !== undefined && cs !== null && Number.isFinite(Number(cs)) && Number(cs) < qty) {
              return NextResponse.json(
                {
                  success: false,
                  error: `Insufficient stock for "${p.name}" for the selected options.`,
                },
                { status: 400 }
              );
            }
          }
        } else if (!modernPick) {
          return NextResponse.json(
            {
              success: false,
              error: `Please select options for "${p.name}" before checkout.`,
            },
            { status: 400 }
          );
        }
      }
      const variationFromCart = String(raw.variationLabel || "").trim().slice(0, 200);
      const selectedVariation = normalizeSelectedVariation(raw.selectedVariation);
      if (selectedVariation?.choices?.length) {
        for (const c of selectedVariation.choices) {
          const opt = findOptionOnProduct(p, c);
          if (opt && typeof opt.stock === "number" && Number.isFinite(opt.stock) && opt.stock < qty) {
            return NextResponse.json(
              { success: false, error: `Insufficient stock for ${p.name} (${c.optionValue}).` },
              { status: 400 }
            );
          }
        }
      }
      const {
        unitPrice,
        perUnitWeightKg,
        surcharge,
        variant: lineVariant,
        combo: pricedCombo,
      } = lineUnitPriceAndShipping(p, raw, selectedVariation);
      const lineCombo = pricedCombo || resolvedCombo;
      const variation =
        variationFromCart ||
        variationLabelFromCombo(lineCombo) ||
        String(selectedVariation?.label || "").trim().slice(0, 200);
      const matchedWeightTotal = getOrderWeight([
        {
          shipping: { weight: p?.shipping?.weight ?? p?.inventory?.weight ?? 0 },
          weight: raw?.weight ?? perUnitWeightKg,
          matchedCombination: lineCombo || raw?.matchedCombination || null,
          quantity: qty,
        },
      ]);
      const lineWeightKg = matchedWeightTotal > 0 ? matchedWeightTotal : perUnitWeightKg * qty;
      totalOrderWeightKg += lineWeightKg;
      totalSurcharge += surcharge * qty;
      const comboImage =
        typeof lineCombo?.image === "string"
          ? lineCombo.image
          : lineCombo?.image?.url
            ? String(lineCombo.image.url)
            : "";
      const img =
        String(raw.image || "").trim() ||
        comboImage ||
        (lineVariant?.image?.url ? String(lineVariant.image.url) : "") ||
        p.media?.images?.find((i) => i.isMain)?.url ||
        p.media?.images?.[0]?.url ||
        "";
      const lineTotal = Math.round(unitPrice * qty * 100) / 100;
      const unitCost = Math.max(0, Number(p.pricing?.costPerItem) || 0);
      const advancePercentRequired = Math.min(
        100,
        Math.max(0, Math.round(Number(p.advancePercentRequired) || 0))
      );
      subtotal += lineTotal;
      lineItems.push({
        productId: p._id,
        articleNo: String(p.articleNo || "").trim(),
        name: p.name,
        image: img,
        variation,
        selectedVariation: selectedVariation || (variation
          ? {
              label: variation,
              choices: (lineCombo?.options || []).map((o) => ({
                variationName: o.name,
                optionValue: o.value,
              })),
            }
          : null),
        calculatedWeight: Math.round(perUnitWeightKg * 1000) / 1000,
        estimatedShipping: Math.max(0, Number(raw.estimatedShipping) || 0),
        customMeasurements: normalizeMeasurements(raw.customMeasurements),
        quantity: qty,
        unitPrice: unitPrice,
        unitCost,
        total: lineTotal,
        advancePercentRequired,
      });
    }

    if (!lineItems.length) {
      return NextResponse.json({ success: false, error: "No valid line items." }, { status: 400 });
    }

    subtotal = Math.round(subtotal * 100) / 100;
    let discount = 0;
    let couponCode = "";
    let couponId = null;
    let advancePaymentDiscount = 0;

    const code = String(body.couponCode || "").trim().toUpperCase();
    if (code) {
      const coupon = await Coupon.findOne({ code }).lean();
      const catIds = [...categoryIdSet];
      const r = computeCouponDiscount(coupon, subtotal, catIds);
      if (r.valid) {
        discount = r.discount;
        couponCode = code;
        couponId = coupon._id;
      }
    }

    const settingsDoc =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
      (await Settings.findOne({}).lean());
    const storePayment = normalizeShippingRules(settingsDoc?.storePayment);
    const whatsappNumber = String(settingsDoc?.whatsapp?.number || "").trim();
    const pakMethods = normalizePakistaniPaymentMethods(settingsDoc?.pakistaniPaymentMethods);
    if (isOfflinePakistaniPayment(paymentMethod) && pakMethods[paymentMethod]?.enabled !== true) {
      return NextResponse.json(
        { success: false, error: "Selected payment method is not available." },
        { status: 400 }
      );
    }

    const afterCoupon = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
    const adv = computeAdvancePaymentDiscount({
      amountAfterCoupon: afterCoupon,
      paymentMethod,
      storePayment,
    });
    advancePaymentDiscount = adv.discount;
    discount = Math.max(0, Math.round((discount + advancePaymentDiscount) * 100) / 100);

    const activeZones = await ShippingZone.find({ status: "active" }).sort({ sortOrder: 1 }).lean();
    const totalWeightGrams = Math.max(0, Math.round(totalOrderWeightKg * 1000));
    const orderSubtotalAfterDiscount = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
    const country = String(shippingAddress.country || "Pakistan").trim();
    const city = String(shippingAddress.city || "").trim();
    const province = String(shippingAddress.state || shippingAddress.province || "").trim();
    const quote = quoteShipping(
      activeZones,
      country,
      city,
      totalWeightGrams,
      orderSubtotalAfterDiscount,
      province
    );
    let shippingCost = 0;
    let shippingMethod = "";
    let shippingZoneLabel = "";

    const zoneShippingCost = Math.round(Math.max(0, Number(quote.shippingCost) || 0) * 100) / 100;
    const rulesResult = applyShippingRules({
      baseDeliveryCharge: zoneShippingCost,
      zoneShippingCost,
      cartTotal: orderSubtotalAfterDiscount,
      paymentMethod,
      zoneIsFree: Boolean(quote.isFree),
      storePayment,
    });
    shippingCost = Math.round(rulesResult.shippingCost * 100) / 100;
    shippingMethod = "Weight-based";
    shippingZoneLabel = String(quote.zoneName || "").trim();
    const advanceNote = buildAdvancePaymentOrderNote(
      storePayment,
      whatsappNumber || storePolicyWhatsApp(),
      settingsDoc?.pakistaniPaymentMethods
    );
    const statusNotes = [];
    if (advancePaymentDiscount > 0) {
      statusNotes.push(
        `Advance payment discount ${adv.percent}% (−Rs. ${advancePaymentDiscount})`
      );
    }

    const total = Math.max(0, Math.round((subtotal - discount + shippingCost) * 100) / 100);
    const advanceDue = computeCodAdvanceDue({
      items: lineItems.map((li) => ({
        name: li.name,
        unitPrice: li.unitPrice,
        quantity: li.quantity,
        advancePercentRequired: li.advancePercentRequired,
      })),
      paymentMethod,
      shippingCost,
      storeAdvanceAmount: storePayment.advancePaymentAmount,
      advanceMessageEnabled: storePayment.advancePaymentMessageEnabled !== false,
    });
    const advanceRequired = Math.min(total, Math.max(0, Number(advanceDue.amount) || 0));
    const remainingCod =
      paymentMethod === "cod" ? Math.max(0, Math.round((total - advanceRequired) * 100) / 100) : 0;

    if (advanceDue.mode === "percent" && advanceRequired > 0) {
      statusNotes.push(
        `Pay at least ${advanceDue.maxPercent}% advance: Rs. ${advanceRequired}` +
          (remainingCod > 0 ? ` (remaining COD Rs. ${remainingCod})` : "")
      );
    } else if (paymentMethod === "cod" && shippingCost > 0 && advanceNote) {
      statusNotes.push(advanceNote);
    }
    const placedNote = statusNotes.length ? statusNotes.join(" | ") : "Order placed";

    let customerId = null;
    let existing = email
      ? await Customer.findOne({ email })
      : await Customer.findOne({ phone });
    if (!existing && customerRecordEmail) {
      existing = await Customer.findOne({ email: customerRecordEmail });
    }
    if (existing?.isActive === false) {
      return NextResponse.json({ success: false, error: "This account cannot place orders." }, { status: 403 });
    }

    const nameParts = name.split(/\s+/).filter(Boolean);
    const addrBookEntry = {
      label: "Home",
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" ") || "",
      phone: shippingAddress.phone,
      street: shippingAddress.street,
      street2: shippingAddress.street2 || "",
      area: shippingAddress.area || "",
      city: shippingAddress.city,
      province: shippingAddress.state,
      state: shippingAddress.state,
      postcode: shippingAddress.zip || "",
      zip: shippingAddress.zip || "",
      country: shippingAddress.country,
      isDefault: true,
    };
    const legacyAddress = {
      street: shippingAddress.street,
      street2: shippingAddress.street2 || "",
      area: shippingAddress.area || "",
      city: shippingAddress.city,
      state: shippingAddress.state,
      country: shippingAddress.country,
      zip: shippingAddress.zip || "",
    };

    if (existing) {
      customerId = existing._id;
      existing.name = name;
      existing.phone = phone;
      if (email) existing.email = email;
      existing.address = legacyAddress;
      if (!Array.isArray(existing.addresses)) existing.addresses = [];
      const same = existing.addresses.find(
        (a) =>
          String(a.street || a.address || "").trim().toLowerCase() === shippingAddress.street.toLowerCase() &&
          String(a.city || "").trim().toLowerCase() === shippingAddress.city.toLowerCase() &&
          String(a.province || a.state || "").trim().toLowerCase() === shippingAddress.state.toLowerCase()
      );
      if (same) {
        existing.addresses.forEach((a) => {
          a.isDefault = false;
        });
        same.isDefault = true;
        same.street = shippingAddress.street;
        same.street2 = shippingAddress.street2 || "";
        same.area = shippingAddress.area || "";
        same.phone = shippingAddress.phone;
        same.postcode = shippingAddress.zip || "";
        same.zip = shippingAddress.zip || "";
      } else {
        existing.addresses.forEach((a) => {
          a.isDefault = false;
        });
        if (!existing.addresses.length) addrBookEntry.isDefault = true;
        existing.addresses.push(addrBookEntry);
      }
      existing.markModified("addresses");
      await existing.save();
    } else {
      try {
        const created = await Customer.create({
          name,
          firstName: nameParts[0] || "",
          lastName: nameParts.slice(1).join(" ") || "",
          email: customerRecordEmail,
          phone,
          address: legacyAddress,
          addresses: [addrBookEntry],
        });
        customerId = created._id;
      } catch (custErr) {
        // Unique email race on guest+phone — reuse the row that won.
        if (custErr?.code === 11000 && customerRecordEmail) {
          const raced = await Customer.findOne({ email: customerRecordEmail });
          if (raced) {
            customerId = raced._id;
            raced.name = name;
            raced.phone = phone;
            raced.address = legacyAddress;
            raced.markModified("address");
            await raced.save().catch(() => {});
          } else {
            throw custErr;
          }
        } else {
          throw custErr;
        }
      }
    }

    const orderNumber = await allocateOrderNumber();
    const publicAccessToken = randomBytes(24).toString("base64url");

    let order;
    try {
      order = await Order.create({
        orderNumber,
        publicAccessToken,
        customer: {
          name,
          email,
          phone,
          customerId,
        },
        items: lineItems,
        pricing: {
          subtotal,
          discount,
          shippingCost,
          shippingMethod,
          shippingZone: shippingZoneLabel,
          totalWeightGrams,
          total,
        },
        orderStatus: initialStatus,
        paymentStatus,
        paymentMethod,
        payment: {
          amount: total,
          paidAmount: 0,
          remainingCod,
          advanceRequired,
          advanceMode: advanceDue.mode || "",
          advanceMaxPercent: advanceDue.maxPercent || 0,
        },
        shippingAddress,
        couponCode,
        statusHistory: [
          {
            status: initialStatus,
            changedBy: "Store",
            note: placedNote,
          },
        ],
        timeline: [
          {
            status: "placed",
            title: "Order Placed",
            description: `Order #${orderNumber} received successfully`,
            timestamp: new Date(),
            by: "customer",
          },
        ],
        ...(aiAttribution
          ? {
              aiAttributedSource: aiAttribution.source,
              aiAttributedAt: aiAttribution.firstTouchAt,
            }
          : {}),
      });
    } catch (createErr) {
      console.error("Order.create failed:", createErr?.message || createErr);
      return NextResponse.json(
        { success: false, error: "Could not create order. Please try again." },
        { status: 500 }
      );
    }

    // Decrement stock only after the order exists. On failure, reverse any
    // decrements already applied, then cancel the order.
    const stockReversals = [];
    try {
      for (const [key, qty] of byVariant.entries()) {
        const [pid, vid] = key.split("::");
        const p = byId.get(pid);
        const v = findVariantOnProduct(p, vid);
        if (!v || v.trackStock === false) continue;
        const oid = new mongoose.Types.ObjectId(vid);
        const r = await Product.updateOne(
          { _id: pid },
          { $inc: { "variants.$[el].stock": -qty } },
          { arrayFilters: [{ "el._id": oid, "el.stock": { $gte: qty } }] }
        );
        if (r.matchedCount === 0 || r.modifiedCount === 0) {
          throw new Error("VARIANT_STOCK");
        }
        stockReversals.push({
          type: "variant",
          pid,
          oid,
          qty,
        });
      }

      for (const raw of itemsIn) {
        const pid = String(raw.productId || "").trim();
        if (!mongoose.Types.ObjectId.isValid(pid)) continue;
        const p = byId.get(pid);
        if (!p) continue;
        const qty = Math.max(1, Math.min(99, parseInt(raw.quantity, 10) || 1));
        const variantIdStr = String(raw.variantId || "").trim();
        const variantDoc =
          variantIdStr && mongoose.Types.ObjectId.isValid(variantIdStr)
            ? findVariantOnProduct(p, variantIdStr)
            : null;
        if (variantDoc) continue;
        const combo = resolveCombinationFromCart(p, raw);
        if (!combo?._id) continue;
        if (p.inventory?.trackInventory === false) continue;
        const cs = combo.stock;
        if (cs === undefined || cs === null || !Number.isFinite(Number(cs))) continue;
        const oid = combo._id;
        if (allowsBackorder(p)) {
          await Product.updateOne(
            { _id: p._id },
            { $inc: { "variationCombinations.$[el].stock": -qty } },
            { arrayFilters: [{ "el._id": oid }] }
          );
          stockReversals.push({ type: "combo", pid: p._id, oid, qty, soft: true });
          continue;
        }
        const r = await Product.updateOne(
          { _id: p._id },
          { $inc: { "variationCombinations.$[el].stock": -qty } },
          { arrayFilters: [{ "el._id": oid, "el.stock": { $gte: qty } }] }
        );
        if (r.matchedCount === 0 || r.modifiedCount === 0) {
          throw new Error("COMBO_STOCK");
        }
        stockReversals.push({ type: "combo", pid: p._id, oid, qty });
      }

      for (const [pid, qty] of byProduct.entries()) {
        const p = byId.get(pid);
        if (!p?.inventory?.trackInventory) continue;
        if ((p.variants || []).length) continue;
        if (usesComboInventory(p, itemsIn, pid)) continue;
        if (allowsBackorder(p)) {
          await Product.updateOne({ _id: pid }, { $inc: { "inventory.quantity": -qty } });
          stockReversals.push({ type: "base", pid, qty, soft: true });
          continue;
        }
        const updated = await Product.findOneAndUpdate(
          { _id: pid, "inventory.quantity": { $gte: qty } },
          { $inc: { "inventory.quantity": -qty } },
          { new: true }
        ).lean();
        if (!updated) {
          throw new Error("BASE_STOCK");
        }
        stockReversals.push({ type: "base", pid, qty });
      }
    } catch (stockErr) {
      for (const rev of [...stockReversals].reverse()) {
        try {
          if (rev.type === "variant") {
            await Product.updateOne(
              { _id: rev.pid },
              { $inc: { "variants.$[el].stock": rev.qty } },
              { arrayFilters: [{ "el._id": rev.oid }] }
            );
          } else if (rev.type === "combo") {
            await Product.updateOne(
              { _id: rev.pid },
              { $inc: { "variationCombinations.$[el].stock": rev.qty } },
              { arrayFilters: [{ "el._id": rev.oid }] }
            );
          } else if (rev.type === "base") {
            await Product.updateOne({ _id: rev.pid }, { $inc: { "inventory.quantity": rev.qty } });
          }
        } catch (restoreErr) {
          console.error("Stock restore failed:", restoreErr?.message || restoreErr);
        }
      }
      try {
        await Order.findByIdAndUpdate(order._id, {
          $set: {
            orderStatus: "cancelled",
            paymentStatus: "failed",
          },
          $push: {
            statusHistory: {
              status: "cancelled",
              changedBy: "System",
              note: "Auto-cancelled — stock changed during checkout.",
              changedAt: new Date(),
            },
            timeline: {
              status: "cancelled",
              title: "Order cancelled",
              description: "Stock changed while checking out. Please try again.",
              timestamp: new Date(),
              by: "system",
            },
          },
        });
      } catch (cancelErr) {
        console.error("Failed to cancel order after stock error:", cancelErr?.message || cancelErr);
      }
      console.error("Stock decrement after order create failed:", stockErr?.message || stockErr);
      return NextResponse.json(
        { success: false, error: "Stock changed while checking out. Try again." },
        { status: 409 }
      );
    }

    if (couponId) {
      try {
        const couponDoc = await Coupon.findById(couponId).select("usageLimit usedCount").lean();
        const limit = Number(couponDoc?.usageLimit) || 0;
        const filter =
          limit > 0
            ? { _id: couponId, usedCount: { $lt: limit } }
            : { _id: couponId };
        const inc = await Coupon.updateOne(filter, { $inc: { usedCount: 1 } });
        if (limit > 0 && !inc.modifiedCount) {
          console.error("Coupon usageLimit race — increment skipped for", String(couponId));
        }
      } catch (couponErr) {
        console.error("Coupon usedCount increment failed:", couponErr?.message || couponErr);
      }
    }

    if (isValidCustomerEmail(order.customer?.email)) {
      try {
        const storeName = settingsDoc?.general?.storeName || process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk";
        const logoUrl = settingsDoc?.general?.logo?.url || "";
        await sendCustomerOrderConfirmation(order, { storeName, logoUrl });
      } catch (emailError) {
        console.error("Order confirmation email failed:", emailError);
      }
    }

    sendAdminOrderNotification(order).catch((e) =>
      console.error("Admin order notification failed:", e)
    );

    try {
      await recordActionAttempt(checkoutLimitKey, CHECKOUT_RATE);
    } catch {
      /* ignore rate-limit write failures after successful order */
    }

    // Mark matching cart session as recovered
    try {
      const sessionId = String(body.cartSessionId || "").trim();
      const recoveryToken = String(body.cartRecoveryToken || "").trim();
      const filter = sessionId
        ? { sessionId }
        : recoveryToken
          ? { recoveryToken }
          : phone
            ? { "customer.phone": phone, status: { $in: ["active", "abandoned"] } }
            : null;
      if (filter) {
        await CartSession.updateMany(filter, {
          $set: {
            status: "recovered",
            recoveredAt: new Date(),
            convertedOrderId: order._id,
            convertedOrderNumber: order.orderNumber,
            items: [],
            itemCount: 0,
            subtotal: 0,
          },
        });
      }
    } catch (cartErr) {
      console.error("CartSession recover mark failed:", cartErr?.message || cartErr);
    }

    return NextResponse.json({
      success: true,
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      accessToken: publicAccessToken,
      total,
      paymentStatus,
      order: {
        _id: order._id.toString(),
        orderNumber: order.orderNumber,
        pricing: order.pricing,
      },
    });
  } catch (e) {
    if (e.code === 11000) {
      return NextResponse.json({ success: false, error: "Could not save customer." }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: e.message || "Checkout failed." }, { status: 500 });
  }
}
