"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useCart } from "@/context/CartContext";
import {
  useCheckoutMessages,
  usePakistaniPaymentMethods,
  useStorePayment,
  useStoreSettings,
} from "@/context/StoreSettingsContext";
import {
  applyShippingRules,
  computeAdvancePaymentDiscount,
  formatAdvancePaymentMessage,
  formatWhatsAppDisplay,
  getAdvancePaymentAccountLines,
  getCodFreeDeliveryProgress,
  getEffectiveFreeDeliveryThreshold,
  normalizeShippingRules,
  shouldShowAdvancePaymentMessage,
  storePolicyWhatsApp,
} from "@/lib/freeDelivery";
import { computeCodAdvanceDue } from "@/lib/productAdvance";
import {
  getEnabledPakistaniMethods,
  isAdvancePaymentMethod,
  normalizePakistaniPaymentMethods,
} from "@/lib/pakistaniPaymentMethods";
import { FreeDeliveryProgress } from "@/components/store/FreeDeliveryProgress";
import { PakistaniPaymentIcon } from "./PakistaniPaymentIcons";
import { formatPrice } from "@/lib/currency";
import { useCustomer } from "@/lib/customerAuth";
import { PAKISTAN_PROVINCES, STORE_COUNTRY } from "@/lib/constants";
import { resolveProductContentId, trackInitiateCheckout } from "@/lib/metaPixel";
import { standardDeliveryFeeStatement } from "@/lib/storePolicyCopy";
import {
  fetchRecoverCart,
  getCartSessionId,
  getStoredRecoveryToken,
  syncCartToServer,
} from "@/lib/cartSyncClient";

function lineKey(x) {
  const m = x?.customMeasurements && typeof x.customMeasurements === "object" ? x.customMeasurements : {};
  const mk = Object.keys(m)
    .sort()
    .map((k) => `${k}:${m[k]}`)
    .join("|");
  return `${x.productId}::${x.variationLabel || ""}::${mk}`;
}

/** Client-side guard so users only see variant errors when options are actually required and missing. */
function validateCheckoutCartItems(items) {
  for (const item of items) {
    if (item.requiresVariant === false) continue;

    const enabledSimple = (item.simpleVariations || []).filter((v) => v.enabled && v.tags?.length > 0);
    const combos = Array.isArray(item.variationCombinations) ? item.variationCombinations : [];

    const hasVariations =
      item.requiresVariant === true ||
      enabledSimple.length > 0 ||
      combos.length > 1 ||
      (combos.length === 1 && enabledSimple.length > 0);

    if (!hasVariations) continue;

    const hasSelection =
      (item.matchedCombination &&
        typeof item.matchedCombination === "object" &&
        ((item.matchedCombination.options || []).length > 0 || String(item.matchedCombination._id || "").trim())) ||
      item.selectedVariant ||
      (Array.isArray(item.selectedOptions) && item.selectedOptions.length > 0) ||
      String(item.variantId || "").trim() ||
      String(item.variationLabel || "").trim() ||
      item.variant ||
      combos.length === 1;

    if (!hasSelection) {
      return `Please select options for "${item.name}" before checkout.`;
    }
  }
  return null;
}

function validateCheckoutForm(customer, addr) {
  const errors = {};
  const fullName = `${String(customer.firstName || "").trim()} ${String(customer.lastName || "").trim()}`.trim();
  if (!fullName) {
    errors.name = "Name is required";
  }
  const email = String(customer.email || "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Please enter a valid email address";
  }
  if (!String(customer.phone || "").trim()) {
    errors.phone = "Phone number is required";
  }
  if (!String(addr.street || "").trim()) {
    errors.address = "Street address is required";
  }
  if (!String(addr.city || "").trim()) {
    errors.city = "City is required";
  }
  if (!String(addr.state || "").trim()) {
    errors.province = "Province is required";
  }
  return errors;
}

function pakistaniPaymentInstructions(methodKey, config) {
  const key = methodKey || "cod";
  const c = config || {};
  if (key === "cod") {
    return [
      { text: "Pay product amount in cash when your order arrives." },
      { text: "After placing the order, pay delivery charges in advance and send the screenshot on WhatsApp so we can confirm dispatch." },
    ];
  }
  if (key === "jazzcash" || key === "easypaisa") {
    const lines = [{ text: `Send payment via ${c.label || key}.` }];
    if (c.accountNumber) lines.push({ label: "Account number", value: c.accountNumber });
    if (c.accountName) lines.push({ label: "Account name", value: c.accountName });
    lines.push({ text: "Share your payment screenshot on WhatsApp after transfer." });
    return lines;
  }
  if (key === "bankTransfer") {
    const lines = [{ text: "Transfer to our bank account:" }];
    if (c.bankName) lines.push({ label: "Bank", value: c.bankName });
    if (c.accountNumber) lines.push({ label: "Account", value: c.accountNumber });
    if (c.accountTitle) lines.push({ label: "Title", value: c.accountTitle });
    if (c.iban) lines.push({ label: "IBAN", value: c.iban });
    return lines;
  }
  if (key === "meezan") {
    const lines = [{ text: "Transfer to our Meezan Bank account:" }];
    if (c.bankName) lines.push({ label: "Bank", value: c.bankName });
    if (c.accountNumber) lines.push({ label: "Account", value: c.accountNumber });
    if (c.accountTitle) lines.push({ label: "Title", value: c.accountTitle });
    if (c.iban) lines.push({ label: "IBAN", value: c.iban });
    return lines;
  }
  if (key === "hbl" || key === "ubl") {
    const lines = [{ text: `${c.label || key} account details:` }];
    if (c.accountNumber) lines.push({ label: "Account number", value: c.accountNumber });
    if (c.accountTitle) lines.push({ label: "Account title", value: c.accountTitle });
    return lines;
  }
  return [];
}

const CHECKOUT_LABEL = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#374151",
  marginBottom: 4,
};

function checkoutInputStyle(hasError) {
  return {
    width: "100%",
    height: 44,
    padding: "0 12px",
    border: "1px solid",
    borderColor: hasError ? "#dc2626" : "#E5E5E5",
    borderRadius: 6,
    fontSize: 14,
    color: "#111111",
    outline: "none",
    boxSizing: "border-box",
    background: hasError ? "#fef2f2" : "#FFFFFF",
  };
}

function CheckoutProgressSteps({ activeStep }) {
  const steps = [
    { n: 1, label: "Details" },
    { n: 2, label: "Payment" },
    { n: 3, label: "Confirm" },
  ];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        flexWrap: "wrap",
        marginTop: 16,
        marginBottom: 8,
      }}
    >
      {steps.map((step, i) => (
        <span key={step.n} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: activeStep === step.n ? 700 : 500,
              color: activeStep >= step.n ? "#111111" : "#9CA3AF",
            }}
          >
            {step.n}. {step.label}
          </span>
          {i < steps.length - 1 ? (
            <span style={{ color: "#D1D5DB", fontSize: 12 }} aria-hidden>
              →
            </span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

export function CheckoutView() {
  const { items, subtotal, clearCart, replaceItems, cartReady } = useCart();
  const { customer: authCustomer, loading: authLoading } = useCustomer();
  const [checkoutSettings, setCheckoutSettings] = useState({
    requireAccount: false,
    allowGuestCheckout: true,
    showLoginPrompt: true,
  });
  const [customer, setCustomer] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [addr, setAddr] = useState({
    street: "",
    street2: "",
    area: "",
    city: "",
    state: "",
    country: STORE_COUNTRY,
    zip: "",
  });
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponHint, setCouponHint] = useState("");
  const [discountPreview, setDiscountPreview] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [zoneShippingCost, setZoneShippingCost] = useState(0);
  const [shippingZone, setShippingZone] = useState("");
  const [shippingIsFree, setShippingIsFree] = useState(false);
  const [shippingData, setShippingData] = useState(null);
  const [calculatingShipping, setCalculatingShipping] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [fieldErrors, setFieldErrors] = useState({});
  const [showStreet2, setShowStreet2] = useState(false);
  const initiateCheckoutFired = useRef(false);
  const checkoutMessages = useCheckoutMessages();
  const storePayment = useStorePayment();
  const settings = useStoreSettings();
  const shippingRules = useMemo(() => normalizeShippingRules(storePayment), [storePayment]);
  const pakistaniPaymentRaw = usePakistaniPaymentMethods();
  const cartAllowsCod = useMemo(
    () => items.every((x) => x?.codEnabled !== false),
    [items]
  );
  const pakistaniMethods = useMemo(() => {
    const list = getEnabledPakistaniMethods(normalizePakistaniPaymentMethods(pakistaniPaymentRaw));
    if (cartAllowsCod) return list;
    return list.filter((m) => String(m.key || "").toLowerCase() !== "cod");
  }, [pakistaniPaymentRaw, cartAllowsCod]);

  useEffect(() => {
    if (cartAllowsCod) return;
    if (String(paymentMethod || "").toLowerCase() === "cod") {
      const fallback = pakistaniMethods[0]?.key || "bankTransfer";
      setPaymentMethod(fallback);
    }
  }, [cartAllowsCod, paymentMethod, pakistaniMethods]);

  // Restore cart from abandoned-cart recovery link (?recover=TOKEN)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const token = String(params.get("recover") || "").trim();
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchRecoverCart(token);
        if (cancelled || !Array.isArray(data.items) || !data.items.length) return;
        const restored = data.items.map((i) => ({
          _id: i.productId,
          id: i.productId,
          itemId: i.productId,
          productId: i.productId,
          slug: i.slug || "",
          name: i.name || "Product",
          image: i.image || "",
          price: Number(i.unitPrice ?? i.price) || 0,
          unitPrice: Number(i.unitPrice ?? i.price) || 0,
          variantId: i.variantId || "",
          quantity: Math.max(1, Number(i.quantity) || 1),
          variationLabel: i.variationLabel || "",
          articleNo: i.articleNo || "",
          sku: i.sku || "",
        }));
        replaceItems(restored);
        if (data.customer?.email || data.customer?.phone || data.customer?.name) {
          const parts = String(data.customer.name || "")
            .trim()
            .split(/\s+/)
            .filter(Boolean);
          setCustomer((f) => ({
            ...f,
            firstName: f.firstName || parts[0] || "",
            lastName: f.lastName || parts.slice(1).join(" ") || "",
            email: f.email || data.customer.email || "",
            phone: f.phone || data.customer.phone || "",
          }));
        }
        toast.success("Your cart was restored — complete checkout below.");
        params.delete("recover");
        const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
        window.history.replaceState({}, "", next);
      } catch (e) {
        toast.error(e.message || "Could not restore cart.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [replaceItems]);

  // Keep abandoned-cart contact fields in sync while filling checkout
  useEffect(() => {
    const t = setTimeout(() => {
      const name = `${String(customer.firstName || "").trim()} ${String(customer.lastName || "").trim()}`.trim();
      if (!name && !customer.email && !customer.phone && !items.length) return;
      syncCartToServer({
        items,
        customer: {
          name,
          email: customer.email,
          phone: customer.phone,
        },
        path: "/checkout",
      });
    }, 1500);
    return () => clearTimeout(t);
  }, [customer.firstName, customer.lastName, customer.email, customer.phone, items]);

  const freeThreshold = useMemo(
    () => getEffectiveFreeDeliveryThreshold(settings?.storePayment || storePayment),
    [settings?.storePayment, storePayment]
  );

  const freeDeliveryNote = useMemo(() => standardDeliveryFeeStatement(), []);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((body) => {
        const s = body?.data || body;
        const c = s?.checkout;
        if (c && typeof c === "object") {
          setCheckoutSettings({
            requireAccount: c.requireAccount === true,
            allowGuestCheckout: c.allowGuestCheckout !== false,
            showLoginPrompt: c.showLoginPrompt !== false,
          });
        }
      })
      .catch(() => {});
  }, []);

  /** Meta Pixel InitiateCheckout — once when checkout opens with a non-empty cart. */
  useEffect(() => {
    if (initiateCheckoutFired.current || !items.length) return;
    initiateCheckoutFired.current = true;
    const contentIds = items.map((it) => resolveProductContentId(it)).filter(Boolean);
    const numItems = items.reduce((sum, it) => sum + Math.max(1, Number(it.quantity) || 1), 0);
    trackInitiateCheckout({
      contentIds,
      value: subtotal,
      numItems,
    });
  }, [items, subtotal]);

  const phonePlaceholder = "+92 3XX XXXXXXX";
  const zipPlaceholder = "51310 (5 digits, optional)";

  const refreshCoupon = useCallback(async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setDiscountPreview(0);
      setCouponHint("");
      return;
    }
    try {
      const res = await fetch("/api/coupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, orderAmount: subtotal, categoryIds: [] }),
      });
      const json = await res.json();
      if (json.success && json.valid) {
        setDiscountPreview(Number(json.discount) || 0);
        setCouponHint(json.message || "Applied");
      } else {
        setDiscountPreview(0);
        setCouponHint(json.message || "Invalid coupon");
      }
    } catch {
      setDiscountPreview(0);
      setCouponHint("");
    }
  }, [couponCode, subtotal]);

  useEffect(() => {
    const t = setTimeout(() => refreshCoupon(), 400);
    return () => clearTimeout(t);
  }, [refreshCoupon]);

  useEffect(() => {
    fetch("/api/customer/me", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (!j.success || !j.customer) return;
        const c = j.customer;
        const full = String(c.name || "").trim();
        const parts = full.split(/\s+/).filter(Boolean);
        setCustomer({
          firstName: String(c.firstName || "").trim() || parts[0] || "",
          lastName: String(c.lastName || "").trim() || parts.slice(1).join(" ") || "",
          email: c.email || "",
          phone: c.phone || "",
        });
        const list = Array.isArray(c.addresses) ? c.addresses : [];
        setSavedAddresses(list);
        const def =
          list.find((a) => a.isDefault) ||
          list[0] ||
          (c.address && (c.address.street || c.address.city) ? c.address : null);
        if (!def) return;
        const province = def.province || def.state || "";
        const street = def.street || def.address || "";
        setAddr((prev) => ({
          ...prev,
          street,
          street2: def.street2 || def.line2 || "",
          area: def.area || "",
          city: def.city || "",
          state: province,
          country: STORE_COUNTRY,
          zip: def.zip || def.postcode || "",
        }));
        if (def.street2 || def.line2) setShowStreet2(true);
        if (def._id || def.id) setSelectedAddressId(String(def._id || def.id));
        if (def.phone) {
          setCustomer((f) => ({ ...f, phone: f.phone || def.phone }));
        }
        if (def.firstName || def.lastName) {
          setCustomer((f) => ({
            ...f,
            firstName: f.firstName || def.firstName || "",
            lastName: f.lastName || def.lastName || "",
          }));
        }
      })
      .catch(() => {});
  }, []);

  const applySavedAddress = useCallback(
    (entry) => {
      if (!entry) return;
      const id = String(entry._id || entry.id || "");
      setSelectedAddressId(id);
      const province = entry.province || entry.state || "";
      setAddr({
        street: entry.street || entry.address || "",
        street2: entry.street2 || entry.line2 || "",
        area: entry.area || "",
        city: entry.city || "",
        state: province,
        country: STORE_COUNTRY,
        zip: entry.zip || entry.postcode || "",
      });
      if (entry.street2 || entry.line2) setShowStreet2(true);
      if (entry.phone) setCustomer((f) => ({ ...f, phone: entry.phone }));
      if (entry.firstName || entry.lastName) {
        setCustomer((f) => ({
          ...f,
          firstName: entry.firstName || f.firstName,
          lastName: entry.lastName || f.lastName,
        }));
      }
    },
    []
  );

  const totalWeightGrams = useMemo(() => {
    return items.reduce((total, item) => {
      const qty = Math.max(1, Number(item.quantity) || 1);
      const kg = Number(item.calculatedWeight);
      if (kg > 0) return total + Math.round(kg * 1000) * qty;
      const itemWeight =
        Number(item.matchedCombination?.weight) ||
        Number(item.shipping?.weight) ||
        Number(item.weight);
      if (Number.isFinite(itemWeight) && itemWeight > 0) return total + Math.round(itemWeight) * qty;
      return total + 50 * qty;
    }, 0);
  }, [items]);

  const cartTotalAfterDiscount = useMemo(
    () => Math.max(0, Math.round((subtotal - discountPreview) * 100) / 100),
    [subtotal, discountPreview]
  );

  const advanceDiscountInfo = useMemo(
    () =>
      computeAdvancePaymentDiscount({
        amountAfterCoupon: cartTotalAfterDiscount,
        paymentMethod,
        storePayment,
      }),
    [cartTotalAfterDiscount, paymentMethod, storePayment]
  );
  const advanceDiscount = advanceDiscountInfo.discount;
  const totalDiscount = Math.max(
    0,
    Math.round((discountPreview + advanceDiscount) * 100) / 100
  );
  const cartTotalAfterAllDiscounts = useMemo(
    () => Math.max(0, Math.round((subtotal - totalDiscount) * 100) / 100),
    [subtotal, totalDiscount]
  );

  const shippingApplied = useMemo(
    () =>
      applyShippingRules({
        zoneShippingCost,
        cartTotal: cartTotalAfterAllDiscounts,
        paymentMethod,
        zoneIsFree: shippingIsFree,
        storePayment,
      }),
    [zoneShippingCost, cartTotalAfterAllDiscounts, paymentMethod, shippingIsFree, storePayment]
  );
  const displayShippingCost = shippingApplied.shippingCost;
  const displayShippingFree = shippingApplied.isFree;

  const codFreeDeliveryProgress = useMemo(
    () => getCodFreeDeliveryProgress(cartTotalAfterDiscount, freeThreshold),
    [cartTotalAfterDiscount, freeThreshold]
  );

  const showShippingAsFree = displayShippingFree;

  const whatsappNumber = String(
    settings?.whatsapp?.number || process.env.NEXT_PUBLIC_WHATSAPP || storePolicyWhatsApp()
  ).trim();
  const whatsappDisplay = formatWhatsAppDisplay(whatsappNumber || storePolicyWhatsApp());
  const showAdvanceMessage = shouldShowAdvancePaymentMessage({
    paymentMethod,
    shippingCost: displayShippingCost,
    storePayment,
  });
  const productAdvanceDue = useMemo(
    () =>
      computeCodAdvanceDue({
        items,
        paymentMethod,
        shippingCost: displayShippingCost,
        storeAdvanceAmount: shippingRules.advancePaymentAmount,
        advanceMessageEnabled: shippingRules.advancePaymentMessageEnabled !== false,
      }),
    [items, paymentMethod, displayShippingCost, shippingRules]
  );
  const effectiveAdvanceAmount =
    productAdvanceDue.mode === "percent"
      ? productAdvanceDue.amount
      : shippingRules.advancePaymentAmount || displayShippingCost || 250;
  const showProductAdvanceBox =
    paymentMethod === "cod" && productAdvanceDue.mode === "percent" && productAdvanceDue.amount > 0;
  const advanceMessageBody = formatAdvancePaymentMessage(
    showProductAdvanceBox
      ? `To confirm after placing your order, please pay at least {amount} in advance (${productAdvanceDue.maxPercent}% of eligible items).\n\nSend payment screenshot on WhatsApp: {whatsapp}`
      : shippingRules.advancePaymentMessage,
    effectiveAdvanceAmount,
    whatsappDisplay
  );
  const advanceAccountLines = useMemo(
    () => getAdvancePaymentAccountLines(normalizePakistaniPaymentMethods(pakistaniPaymentRaw)),
    [pakistaniPaymentRaw]
  );

  const calculateShipping = useCallback(
    async (country, city, province) => {
      const co = String(country || STORE_COUNTRY).trim();
      const prov = String(province || "").trim();
      if (!prov) {
        setZoneShippingCost(0);
        setShippingZone("");
        setShippingIsFree(false);
        setShippingData(null);
        return;
      }
      setCalculatingShipping(true);
      try {
        const res = await fetch("/api/shipping/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            country: co,
            city: String(city || "").trim(),
            province: prov,
            state: prov,
            totalWeight: totalWeightGrams,
            orderSubtotal: cartTotalAfterDiscount,
          }),
        });
        const data = await res.json();
        if (data.success !== false) {
          setShippingData(data);
          setZoneShippingCost(Math.max(0, Number(data.shippingCost) || 0));
          setShippingZone(String(data.zoneName || data.zone || "").trim());
          setShippingIsFree(Boolean(data.isFree));
        } else {
          setShippingData(null);
          setZoneShippingCost(0);
          setShippingZone("");
          setShippingIsFree(false);
        }
      } catch {
        setShippingData(null);
        setZoneShippingCost(0);
        setShippingZone("");
        setShippingIsFree(false);
      } finally {
        setCalculatingShipping(false);
      }
    },
    [totalWeightGrams, cartTotalAfterDiscount]
  );

  useEffect(() => {
    if (!items.length) {
      setZoneShippingCost(0);
      setShippingZone("");
      setShippingIsFree(false);
      setShippingData(null);
      return;
    }
    const country = STORE_COUNTRY;
    const city = String(addr.city || "").trim();
    const province = String(addr.state || "").trim();
    if (!province) {
      setZoneShippingCost(0);
      setShippingZone("");
      setShippingIsFree(false);
      setShippingData(null);
      return;
    }
    const t = setTimeout(() => {
      calculateShipping(country, city, province);
    }, 600);
    return () => clearTimeout(t);
  }, [addr.country, addr.city, addr.state, items.length, totalWeightGrams, cartTotalAfterDiscount, calculateShipping]);

  const total = useMemo(
    () => Math.max(0, Math.round((subtotal - totalDiscount + displayShippingCost) * 100) / 100),
    [subtotal, totalDiscount, displayShippingCost]
  );
  const totalWeightKg = useMemo(() => totalWeightGrams / 1000, [totalWeightGrams]);

  const fullNameValue = useMemo(
    () => `${String(customer.firstName || "").trim()} ${String(customer.lastName || "").trim()}`.trim(),
    [customer.firstName, customer.lastName]
  );

  const detailsComplete = useMemo(
    () =>
      Boolean(
        fullNameValue &&
          String(customer.phone || "").trim() &&
          String(addr.street || "").trim() &&
          String(addr.city || "").trim() &&
          String(addr.state || "").trim()
      ),
    [fullNameValue, customer.phone, addr.street, addr.city, addr.state]
  );

  const activeStep = submitting ? 3 : detailsComplete ? 2 : 1;

  async function handleProceedToPayment() {
    if (!items.length) {
      toast.error(checkoutMessages.cartEmptyMessage || "Your cart is empty.");
      return;
    }

    if (storePayment.minimumOrderAmount > 0 && subtotal < storePayment.minimumOrderAmount) {
      toast.error(`Minimum order amount is ${formatPrice(storePayment.minimumOrderAmount)}`);
      return;
    }

    const errors = validateCheckoutForm(customer, addr);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setTimeout(() => {
        document.querySelector(".field-error")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 0);
      return;
    }
    setFieldErrors({});

    const variantErr = validateCheckoutCartItems(items);
    if (variantErr) {
      toast.error(variantErr);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((x) => ({
            productId: x.productId,
            quantity: x.quantity,
            variantId: x.variantId || "",
            variationLabel: x.variationLabel,
            selectedVariation: x.selectedVariation || null,
            selectedOptions: x.selectedOptions || null,
            matchedCombination: x.matchedCombination || null,
            calculatedWeight: x.calculatedWeight || 0,
            unitPrice: x.unitPrice ?? x.price,
            shippingPriceSurcharge: x.shippingPriceSurcharge || 0,
            estimatedShipping: x.estimatedShipping || 0,
            customMeasurements: x.customMeasurements || {},
          })),
          customer: {
            ...customer,
            name: `${String(customer.firstName || "").trim()} ${String(customer.lastName || "").trim()}`.trim(),
          },
          shippingAddress: {
            name: `${String(customer.firstName || "").trim()} ${String(customer.lastName || "").trim()}`.trim(),
            phone: customer.phone,
            ...addr,
          },
          shippingCost: displayShippingCost,
          shippingZone,
          totalWeight: totalWeightGrams,
          couponCode: couponCode.trim(),
          paymentMethod,
          paymentStatus: "pending",
          status: "pending",
          cartSessionId: getCartSessionId(),
          cartRecoveryToken: getStoredRecoveryToken(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Checkout failed");
        return;
      }
      const nextOrderId = json.orderId || json.order?._id || null;
      const accessToken = String(json.accessToken || "").trim();
      if (!nextOrderId) {
        toast.error("Order created but missing order id.");
        return;
      }
      try {
        if (typeof clearCart === "function") clearCart();
      } catch {
        try {
          localStorage.removeItem("cart");
          localStorage.removeItem("cartItems");
        } catch {
          /* ignore */
        }
      }
      const qs = new URLSearchParams({ order_id: String(nextOrderId) });
      if (accessToken) qs.set("t", accessToken);
      window.location.href = `/checkout/success?${qs.toString()}`;
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  const mustSignIn =
    !authLoading &&
    (checkoutSettings.requireAccount === true || checkoutSettings.allowGuestCheckout === false) &&
    !authCustomer;

  const showOptionalLoginPrompt =
    !authLoading &&
    checkoutSettings.showLoginPrompt === true &&
    !authCustomer &&
    checkoutSettings.allowGuestCheckout !== false &&
    checkoutSettings.requireAccount !== true;

  if (!cartReady) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-zinc-600">Loading your cart…</p>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-zinc-600">{checkoutMessages.cartEmptyMessage || "Your cart is empty."}</p>
        <Link href="/products" className="mt-4 inline-block font-semibold text-emerald-700 hover:underline">
          Continue shopping
        </Link>
      </div>
    );
  }

  if (mustSignIn) {
    return (
      <div
        style={{
          maxWidth: 480,
          margin: "0 auto",
          padding: "60px 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5E5E5",
            borderRadius: 12,
            padding: 40,
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          }}
        >
          <p style={{ fontSize: 40, marginBottom: 16 }}>🔐</p>
          <h2
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 22,
              fontWeight: 700,
              color: "#111111",
              margin: "0 0 8px",
            }}
          >
            Account Required
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "#888888",
              margin: "0 0 32px",
              lineHeight: 1.6,
            }}
          >
            Please sign in or create an account to complete your purchase.
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <Link
              href="/account/login?redirect=/checkout"
              style={{
                display: "block",
                padding: "14px",
                background: "#111111",
                color: "#FFFFFF",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                borderRadius: 6,
                textAlign: "center",
              }}
            >
              Sign In
            </Link>
            <Link
              href="/account/register?redirect=/checkout"
              style={{
                display: "block",
                padding: "14px",
                background: "#FFFFFF",
                color: "#111111",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                borderRadius: 6,
                border: "2px solid #111111",
                textAlign: "center",
              }}
            >
              Create Account
            </Link>
          </div>

          <p
            style={{
              fontSize: 12,
              color: "#888888",
              marginTop: 24,
            }}
          >
            Your cart items will be saved
          </p>
        </div>
      </div>
    );
  }

  const placeOrderLabel = submitting ? "Placing order…" : "Place Order";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-zinc-900">Checkout</h1>
      <CheckoutProgressSteps activeStep={activeStep} />
      {showOptionalLoginPrompt ? (
        <div
          style={{
            background: "#F8F7FF",
            border: "1px solid #E0DEFF",
            borderRadius: 8,
            padding: "14px 16px",
            marginTop: 20,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#5b21b6",
                margin: "0 0 2px",
              }}
            >
              Have an account? Sign in for faster checkout
            </p>
            <p
              style={{
                fontSize: 11,
                color: "#7c3aed",
                margin: 0,
              }}
            >
              Your order history and details will be saved
            </p>
          </div>
          <Link
            href="/account/login?redirect=/checkout"
            style={{
              padding: "8px 16px",
              background: "#5b21b6",
              color: "#FFFFFF",
              textDecoration: "none",
              fontSize: 12,
              fontWeight: 700,
              borderRadius: 6,
              whiteSpace: "nowrap",
            }}
          >
            Sign In
          </Link>
        </div>
      ) : null}
      <div className="checkout-grid mt-6 grid gap-6 lg:grid-cols-[3fr_2fr] lg:items-start">
        <div className="checkout-form-col min-w-0">
          {Object.values(fieldErrors).some(Boolean) ? (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                padding: "12px 16px",
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p style={{ fontSize: 13, color: "#dc2626", margin: 0, fontWeight: 500 }}>
                Please fill in all required fields marked with *
              </p>
            </div>
          ) : null}

          <h2 className="mb-3 text-base font-semibold text-zinc-900">Delivery details</h2>

          {savedAddresses.length > 0 ? (
            <div style={{ marginBottom: 16 }}>
              <label style={CHECKOUT_LABEL}>Saved addresses</label>
              <div style={{ display: "grid", gap: 8 }}>
                {savedAddresses.map((a) => {
                  const id = String(a._id || a.id || "");
                  const active = selectedAddressId === id;
                  return (
                    <button
                      key={id || `${a.street}-${a.city}`}
                      type="button"
                      onClick={() => applySavedAddress(a)}
                      style={{
                        textAlign: "left",
                        padding: "12px 14px",
                        borderRadius: 8,
                        border: active ? "2px solid #111111" : "1px solid #E5E5E5",
                        background: active ? "#fafafa" : "#fff",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#111" }}>
                        {a.label || "Address"}
                        {a.isDefault ? (
                          <span style={{ marginLeft: 8, color: "#D72323", fontWeight: 600 }}>Default</span>
                        ) : null}
                      </span>
                      <span style={{ display: "block", fontSize: 12, color: "#666", marginTop: 4, lineHeight: 1.4 }}>
                        {[a.street || a.address, a.area, a.city, a.province || a.state].filter(Boolean).join(", ")}
                      </span>
                    </button>
                  );
                })}
                <Link href="/account/addresses" style={{ fontSize: 12, color: "#D72323", fontWeight: 600 }}>
                  Manage addresses →
                </Link>
              </div>
            </div>
          ) : null}

          <div className="mb-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div>
              <label style={CHECKOUT_LABEL}>
                Name <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="text"
                autoComplete="name"
                value={fullNameValue}
                onChange={(e) => {
                  const parts = e.target.value.trim().split(/\s+/).filter(Boolean);
                  setCustomer((f) => ({
                    ...f,
                    firstName: parts[0] || "",
                    lastName: parts.slice(1).join(" "),
                  }));
                  if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: "" }));
                }}
                placeholder="Your name"
                style={checkoutInputStyle(Boolean(fieldErrors.name))}
              />
              {fieldErrors.name ? (
                <p className="field-error" style={{ fontSize: 11, color: "#dc2626", margin: "4px 0 0" }}>
                  ⚠ {fieldErrors.name}
                </p>
              ) : null}
            </div>
            <div>
              <label style={CHECKOUT_LABEL}>Email (optional)</label>
              <input
                type="text"
                inputMode="email"
                autoComplete="email"
                value={customer.email || ""}
                onChange={(e) => {
                  setCustomer((f) => ({ ...f, email: e.target.value }));
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: "" }));
                }}
                placeholder="your@email.com"
                style={checkoutInputStyle(Boolean(fieldErrors.email))}
              />
              {fieldErrors.email ? (
                <p className="field-error" style={{ fontSize: 11, color: "#dc2626", margin: "4px 0 0" }}>
                  ⚠ {fieldErrors.email}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mb-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div>
              <label style={CHECKOUT_LABEL}>
                Phone <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="tel"
                autoComplete="tel"
                value={customer.phone || ""}
                onChange={(e) => {
                  setCustomer((f) => ({ ...f, phone: e.target.value }));
                  if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: "" }));
                }}
                placeholder={phonePlaceholder}
                style={checkoutInputStyle(Boolean(fieldErrors.phone))}
              />
              {fieldErrors.phone ? (
                <p className="field-error" style={{ fontSize: 11, color: "#dc2626", margin: "4px 0 0" }}>
                  ⚠ {fieldErrors.phone}
                </p>
              ) : null}
            </div>
            <div>
              <label style={CHECKOUT_LABEL}>Postal Code (optional)</label>
              <input
                placeholder={zipPlaceholder}
                value={addr.zip}
                maxLength={5}
                onChange={(e) => setAddr((s) => ({ ...s, zip: e.target.value.replace(/\D/g, "").slice(0, 5) }))}
                style={checkoutInputStyle(false)}
              />
            </div>
          </div>

          <div className="mb-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div>
              <label style={CHECKOUT_LABEL}>
                City <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Your city"
                value={addr.city || ""}
                onChange={(e) => {
                  setAddr((s) => ({ ...s, city: e.target.value }));
                  if (fieldErrors.city) setFieldErrors((prev) => ({ ...prev, city: "" }));
                }}
                style={checkoutInputStyle(Boolean(fieldErrors.city))}
              />
              {fieldErrors.city ? (
                <p className="field-error" style={{ fontSize: 11, color: "#dc2626", margin: "4px 0 0" }}>
                  ⚠ {fieldErrors.city}
                </p>
              ) : null}
            </div>
            <div>
              <label style={CHECKOUT_LABEL}>
                Province <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <select
                value={addr.state || ""}
                onChange={(e) => {
                  setAddr((s) => ({ ...s, state: e.target.value }));
                  if (fieldErrors.province) setFieldErrors((prev) => ({ ...prev, province: "" }));
                }}
                style={{
                  ...checkoutInputStyle(Boolean(fieldErrors.province)),
                  color: addr.state ? "#111111" : "#888888",
                  cursor: "pointer",
                }}
              >
                <option value="">Select province…</option>
                {PAKISTAN_PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              {fieldErrors.province ? (
                <p className="field-error" style={{ fontSize: 11, color: "#dc2626", margin: "4px 0 0" }}>
                  ⚠ {fieldErrors.province}
                </p>
              ) : null}
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={CHECKOUT_LABEL}>
              Address <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              type="text"
              autoComplete="street-address"
              value={addr.street || ""}
              onChange={(e) => {
                setAddr((s) => ({ ...s, street: e.target.value }));
                if (fieldErrors.address) setFieldErrors((prev) => ({ ...prev, address: "" }));
              }}
              placeholder="House / street, area, landmark"
              style={checkoutInputStyle(Boolean(fieldErrors.address))}
            />
            {fieldErrors.address ? (
              <p className="field-error" style={{ fontSize: 11, color: "#dc2626", margin: "4px 0 0" }}>
                ⚠ {fieldErrors.address}
              </p>
            ) : null}
          </div>

          {!showStreet2 ? (
            <button
              type="button"
              onClick={() => setShowStreet2(true)}
              style={{
                marginBottom: 14,
                padding: 0,
                border: "none",
                background: "none",
                color: "#C41E1E",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              + Add address line 2
            </button>
          ) : (
            <div style={{ marginBottom: 14 }}>
              <label style={CHECKOUT_LABEL}>Address line 2 (optional)</label>
              <input
                type="text"
                value={addr.street2 || ""}
                onChange={(e) => setAddr((s) => ({ ...s, street2: e.target.value }))}
                placeholder="Apartment, landmark"
                style={checkoutInputStyle(false)}
              />
            </div>
          )}

          <h2 className="mb-2 text-base font-semibold text-zinc-900">Payment</h2>
          <p className="mb-2 text-xs text-zinc-600">{freeDeliveryNote}</p>
          {!cartAllowsCod ? (
            <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Cash on Delivery is not available for one or more items in your cart. Please use advance payment.
            </p>
          ) : null}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E5E5E5",
              borderRadius: 8,
              padding: 12,
              marginBottom: 12,
            }}
          >
            {(pakistaniMethods.length ? pakistaniMethods : [{ key: "cod", label: "Cash on Delivery" }]).map((m) => {
              const selected = paymentMethod === m.key;
              const iconKey = m.key === "bankTransfer" ? "bankTransfer" : m.key;
              return (
                <div key={m.key}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setPaymentMethod(m.key)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setPaymentMethod(m.key);
                      }
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      minHeight: 52,
                      padding: "10px 12px",
                      border: "1px solid",
                      borderColor: selected ? "#C41E1E" : "#E5E7EB",
                      borderRadius: 8,
                      cursor: "pointer",
                      marginBottom: 6,
                      background: selected ? "#FEF2F2" : "#FFFFFF",
                    }}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={m.key}
                      checked={selected}
                      onChange={() => setPaymentMethod(m.key)}
                      style={{ accentColor: "#C41E1E", margin: 0, flexShrink: 0, width: 16, height: 16 }}
                    />
                    <span
                      style={{
                        width: 48,
                        height: 40,
                        flexShrink: 0,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                      }}
                    >
                      <PakistaniPaymentIcon methodKey={iconKey} height={36} />
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#111111",
                        lineHeight: 1.2,
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {m.key === "bankTransfer" ? m.label || "Bank Alfalah" : m.label || m.key}
                      {m.key !== "cod" &&
                      isAdvancePaymentMethod(m.key) &&
                      shippingRules.advancePaymentDiscountEnabled !== false ? (
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: 10,
                            fontWeight: 700,
                            color: "#16A34A",
                            background: "#DCFCE7",
                            padding: "2px 6px",
                            borderRadius: 4,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {shippingRules.advancePaymentDiscountPercent || 3}% OFF
                        </span>
                      ) : null}
                      {m.key === "cod" ? (
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: 10,
                            fontWeight: 700,
                            color: "#B45309",
                            background: "#FEF3C7",
                            padding: "2px 6px",
                            borderRadius: 4,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Delivery charges advance
                        </span>
                      ) : null}
                    </span>
                    {m.key === "cod" && storePayment.codFee > 0 ? (
                      <span style={{ marginLeft: "auto", fontSize: 11, color: "#6B7280" }}>
                        +{formatPrice(storePayment.codFee)}
                      </span>
                    ) : null}
                  </div>
                  {selected ? (
                    <ul
                      style={{
                        margin: "0 0 8px 28px",
                        paddingLeft: 14,
                        fontSize: 11,
                        color: "#374151",
                        lineHeight: 1.5,
                      }}
                    >
                      {pakistaniPaymentInstructions(m.key, m).map((line, i) => (
                        <li key={`${m.key}-${i}`}>
                          {line.label ? (
                            <>
                              <strong style={{ fontWeight: 700, color: "#111111" }}>{line.label}:</strong>{" "}
                              {line.value}
                            </>
                          ) : (
                            line.text
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}

            {shippingApplied.freeReason === "advance_payment" ? (
              <p style={{ fontSize: 12, color: "#16A34A", margin: "4px 0 0", fontWeight: 500 }}>
                🎉 Free delivery
                {shippingRules.advancePaymentDiscountEnabled !== false
                  ? ` + ${shippingRules.advancePaymentDiscountPercent || 3}% off`
                  : ""}{" "}
                when you pay in advance
              </p>
            ) : advanceDiscount > 0 ? (
              <p style={{ fontSize: 12, color: "#16A34A", margin: "4px 0 0", fontWeight: 500 }}>
                🎉 {advanceDiscountInfo.percent}% off for advance payment — delivery Rs.{" "}
                {shippingRules.flatDeliveryCharge || 250}
              </p>
            ) : null}

            {showAdvanceMessage || showProductAdvanceBox ? (
              <div
                style={{
                  marginTop: 10,
                  background: "#FFFBEB",
                  border: "1px solid #FDE68A",
                  borderLeft: "3px solid #F59E0B",
                  borderRadius: 6,
                  padding: "10px 12px",
                }}
              >
                <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 13, color: "#92400E" }}>
                  {showProductAdvanceBox
                    ? `Pay at least ${productAdvanceDue.maxPercent}% advance`
                    : shippingRules.advancePaymentMessageTitle}
                </p>
                <p style={{ margin: "0 0 8px", fontSize: 12, color: "#78350F", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                  {advanceMessageBody}
                </p>
                {showProductAdvanceBox && productAdvanceDue.lines.length ? (
                  <ul style={{ margin: "0 0 8px", paddingLeft: 16, fontSize: 12, color: "#78350F", lineHeight: 1.6 }}>
                    {productAdvanceDue.lines.map((line) => (
                      <li key={`${line.name}-${line.percent}`}>
                        {line.name}: {line.percent}% = {formatPrice(line.amount)}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {advanceAccountLines.length > 0 ? (
                  <ul style={{ margin: "0 0 8px", paddingLeft: 16, fontSize: 12, color: "#78350F", lineHeight: 1.6 }}>
                    {advanceAccountLines.map((line) => (
                      <li key={line.label}>
                        <strong style={{ color: "#92400E" }}>{line.label}:</strong> {line.value}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p style={{ margin: 0, fontSize: 12, color: "#78350F", fontWeight: 700 }}>
                  WhatsApp screenshot: {whatsappDisplay}
                </p>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleProceedToPayment}
            disabled={submitting}
            className="w-full rounded-lg bg-[#C41E1E] py-3 text-sm font-bold text-white hover:bg-[#b91c1c] disabled:opacity-50 lg:hidden"
          >
            {placeOrderLabel}
          </button>

        </div>

        <div className="checkout-summary-col min-w-0">
          <div
            className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm lg:sticky"
            style={{ top: 80 }}
          >
            <h2 className="text-sm font-bold text-zinc-900">Order Summary</h2>
            <ul className="max-h-48 space-y-1.5 overflow-y-auto text-xs">
              {items.map((x) => (
                <li key={lineKey(x)} className="flex justify-between gap-2 text-zinc-700">
                  <span>
                    {x.name} ×{x.quantity}
                    {x.variationLabel ? <span className="block text-xs text-zinc-500">{x.variationLabel}</span> : null}
                    {x.customMeasurements && Object.keys(x.customMeasurements).length ? (
                      <span className="mt-1 block text-xs text-blue-700">
                        {Object.entries(x.customMeasurements)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(" • ")}
                      </span>
                    ) : null}
                  </span>
                  <span className="price shrink-0 tabular-nums">{formatPrice(x.price * x.quantity, addr.country)}</span>
                </li>
              ))}
            </ul>
            <input
              className="w-full rounded-md border border-zinc-200 px-2.5 py-2 text-xs uppercase"
              placeholder="Coupon code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            />
            {couponHint ? <p className="text-[11px] text-zinc-500">{couponHint}</p> : null}
            {items.length > 0 && paymentMethod === "cod" && freeThreshold > 0 ? (
              <FreeDeliveryProgress cartTotal={cartTotalAfterDiscount} threshold={freeThreshold} />
            ) : null}
            <div className="space-y-1 border-t border-zinc-100 pt-2 text-xs">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="price">{formatPrice(subtotal, addr.country)}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Discount</span>
                <span className="price">−{formatPrice(discountPreview, addr.country)}</span>
              </div>
              {advanceDiscount > 0 ? (
                <div className="flex justify-between text-emerald-700">
                  <span>Advance payment ({advanceDiscountInfo.percent}% off)</span>
                  <span className="price">−{formatPrice(advanceDiscount, addr.country)}</span>
                </div>
              ) : null}
              {showProductAdvanceBox ? (
                <>
                  <div className="flex justify-between text-amber-800">
                    <span>Advance due now ({productAdvanceDue.maxPercent}%)</span>
                    <span className="price">{formatPrice(productAdvanceDue.amount, addr.country)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-600">
                    <span>Remaining on delivery</span>
                    <span className="price">
                      {formatPrice(
                        Math.max(0, total - productAdvanceDue.amount),
                        addr.country
                      )}
                    </span>
                  </div>
                </>
              ) : null}
              {shippingApplied.freeReason === "order_above" && shippingRules.freeShippingOnOrderAboveEnabled ? (
                <p style={{ fontSize: 13, color: "#16A34A", margin: "0 0 8px", fontWeight: 500 }}>
                  🎉 Free delivery on orders above {formatPrice(shippingRules.freeShippingOnOrderAbove)}!
                </p>
              ) : null}
              {shippingApplied.freeReason === "advance_payment" ? (
                <p style={{ fontSize: 13, color: "#16A34A", margin: "0 0 8px", fontWeight: 500 }}>
                  🎉 Free delivery + {advanceDiscountInfo.percent || shippingRules.advancePaymentDiscountPercent || 3}% off for advance payment!
                </p>
              ) : advanceDiscount > 0 ? (
                <p style={{ fontSize: 13, color: "#16A34A", margin: "0 0 8px", fontWeight: 500 }}>
                  🎉 {advanceDiscountInfo.percent}% off for advance payment
                </p>
              ) : null}
              <div className="flex justify-between border-b border-zinc-100 pb-1.5">
                <span className="text-zinc-700">Shipping</span>
                <span
                  className={[
                    "text-sm font-semibold tabular-nums",
                    showShippingAsFree ? "text-emerald-600" : "text-zinc-900",
                  ].join(" ")}
                >
                  {calculatingShipping ? (
                    <span className="font-normal text-zinc-400">Calculating…</span>
                  ) : !addr.state ? (
                    <span className="font-normal text-zinc-500">Select province</span>
                  ) : showShippingAsFree ? (
                    "Free"
                  ) : (
                    <span className="price">{formatPrice(displayShippingCost)}</span>
                  )}
                </span>
              </div>
              {addr.state && shippingData?.estimatedDays && !calculatingShipping ? (
                <p className="text-xs text-zinc-500">
                  Estimated delivery: {shippingData.estimatedDays}
                </p>
              ) : null}
              {addr.state && shippingZone && !calculatingShipping ? (
                <p className="text-[11px] text-zinc-400">Zone: {shippingZone}</p>
              ) : null}
              <div className="flex justify-between border-t border-zinc-200 pt-2 text-sm font-bold">
                <span>Total</span>
                <span className="price">{formatPrice(total, addr.country)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleProceedToPayment}
              disabled={submitting}
              className="hidden w-full rounded-lg bg-[#C41E1E] py-3 text-sm font-bold text-white hover:bg-[#b91c1c] disabled:opacity-50 lg:block"
            >
              {placeOrderLabel}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
