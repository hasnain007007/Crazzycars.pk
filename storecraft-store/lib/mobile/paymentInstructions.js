/**
 * Server-side payment instructions for mobile config / order success / order detail.
 * Mirrors web CheckoutView + CheckoutSuccessView so the app does not recompute advances.
 */
import { formatPrice, roundRupees } from "@/lib/currency";
import {
  applyWhatsAppPlaceholder,
  formatAdvancePaymentMessage,
  formatWhatsAppDisplay,
  getAdvancePaymentAccountLines,
  normalizeShippingRules,
  shouldShowAdvancePaymentMessage,
  storePolicyWhatsApp,
  whatsappWaMeDigits,
} from "@/lib/freeDelivery";
import {
  isAdvancePaymentMethod,
  normalizePakistaniPaymentMethods,
  PAKISTANI_PAYMENT_METHOD_KEYS,
} from "@/lib/pakistaniPaymentMethods";

function pickDetailFields(key, cfg) {
  const c = cfg || {};
  const out = {};
  if (key === "jazzcash" || key === "easypaisa") {
    if (c.accountNumber) out.accountNumber = String(c.accountNumber);
    if (c.accountName) out.accountName = String(c.accountName);
  } else if (key === "bankTransfer" || key === "meezan") {
    if (c.bankName) out.bankName = String(c.bankName);
    if (c.accountNumber) out.accountNumber = String(c.accountNumber);
    if (c.accountTitle) out.accountTitle = String(c.accountTitle);
    if (c.iban) out.iban = String(c.iban);
  } else if (key === "hbl" || key === "ubl") {
    if (c.accountNumber) out.accountNumber = String(c.accountNumber);
    if (c.accountTitle) out.accountTitle = String(c.accountTitle);
  }
  return out;
}

function accountLinesForMethod(key, cfg) {
  const c = cfg || {};
  const lines = [];
  if (key === "jazzcash" || key === "easypaisa") {
    if (c.accountNumber) lines.push({ label: "Account number", value: String(c.accountNumber) });
    if (c.accountName) lines.push({ label: "Account name", value: String(c.accountName) });
    return lines;
  }
  if (key === "bankTransfer" || key === "meezan") {
    if (c.bankName) lines.push({ label: "Bank", value: String(c.bankName) });
    if (c.accountNumber) lines.push({ label: "Account", value: String(c.accountNumber) });
    if (c.accountTitle) lines.push({ label: "Title", value: String(c.accountTitle) });
    if (c.iban) lines.push({ label: "IBAN", value: String(c.iban) });
    return lines;
  }
  if (key === "hbl" || key === "ubl") {
    if (c.accountNumber) lines.push({ label: "Account number", value: String(c.accountNumber) });
    if (c.accountTitle) lines.push({ label: "Account title", value: String(c.accountTitle) });
    return lines;
  }
  return [];
}

export function resolveWhatsappContact(settingsDoc) {
  const raw =
    String(settingsDoc?.whatsapp?.number || "").trim() ||
    String(settingsDoc?.general?.phone || "").trim() ||
    storePolicyWhatsApp();
  const display = formatWhatsAppDisplay(raw);
  const waMeDigits = whatsappWaMeDigits(display);
  return {
    number: display,
    display,
    waMeDigits,
  };
}

/** Config payload: enabled methods with copyable details + WhatsApp contact. */
export function buildConfigPaymentMethods(settingsDoc) {
  const pak = normalizePakistaniPaymentMethods(settingsDoc?.pakistaniPaymentMethods);
  const enabledPaymentMethods = PAKISTANI_PAYMENT_METHOD_KEYS.filter((key) => pak[key]?.enabled === true).map(
    (key) => {
      const cfg = pak[key] || {};
      return {
        key,
        label: cfg.label || key,
        icon: cfg.icon || key,
        details: pickDetailFields(key, cfg),
        accountLines: accountLinesForMethod(key, cfg),
      };
    }
  );
  return {
    enabledPaymentMethods,
    whatsapp: resolveWhatsappContact(settingsDoc),
  };
}

/**
 * Build success / detail payment instructions from a placed order + settings.
 * amountDue: COD → advance charge; advance methods → full order total.
 */
export function buildOrderPaymentInstructions(order, settingsDoc) {
  const pak = normalizePakistaniPaymentMethods(settingsDoc?.pakistaniPaymentMethods);
  const storePayment = normalizeShippingRules(settingsDoc?.storePayment);
  const wa = resolveWhatsappContact(settingsDoc);
  const pm = String(order?.paymentMethod || "cod").trim() || "cod";
  const total = Math.max(
    0,
    roundRupees(Number(order?.pricing?.total ?? order?.total ?? order?.payment?.amount) || 0)
  );
  const shippingCost = Math.max(0, roundRupees(Number(order?.pricing?.shippingCost) || 0));
  const advanceRequired = Math.max(0, roundRupees(Number(order?.payment?.advanceRequired) || 0));
  const remainingCod = Math.max(0, roundRupees(Number(order?.payment?.remainingCod) || 0));
  const advanceMode = String(order?.payment?.advanceMode || "");
  const advanceMaxPercent = Math.max(0, Number(order?.payment?.advanceMaxPercent) || 0);

  const isCod = pm === "cod";
  const isAdvance = isAdvancePaymentMethod(pm);

  let amountDue = 0;
  let title = "";
  let message = "";
  let accountLines = [];

  if (isAdvance) {
    amountDue = total;
    title = `Pay via ${pak[pm]?.label || pm}`;
    message = applyWhatsAppPlaceholder(
      String(
        settingsDoc?.storefront?.checkoutSuccess?.paymentConfirmedMessage ||
          "Please send a screenshot of your full payment to our WhatsApp at {whatsapp} for confirmation, and our team will begin processing your order."
      ),
      wa.display
    );
    accountLines = accountLinesForMethod(pm, pak[pm]);
  } else if (isCod) {
    const showDelivery = shouldShowAdvancePaymentMessage({
      paymentMethod: pm,
      shippingCost,
      storePayment,
    });
    const showPercent = advanceMode === "percent" && advanceRequired > 0;
    amountDue = advanceRequired > 0 ? advanceRequired : showDelivery ? shippingCost || storePayment.advancePaymentAmount || 0 : 0;
    amountDue = roundRupees(amountDue);

    if (showPercent) {
      title = `Pay at least ${advanceMaxPercent}% advance`;
      message = formatAdvancePaymentMessage(
        `Please pay at least {amount} in advance (${advanceMaxPercent}% of eligible items).\n\nRemaining on delivery: ${formatPrice(remainingCod)}.\n\nSend payment screenshot on WhatsApp: {whatsapp}`,
        amountDue,
        wa.display
      );
    } else if (amountDue > 0 || showDelivery) {
      title = storePayment.advancePaymentMessageTitle || "Pay Delivery Charges to Confirm";
      message = formatAdvancePaymentMessage(storePayment.advancePaymentMessage, amountDue, wa.display);
    } else {
      title = "Cash on Delivery";
      message = applyWhatsAppPlaceholder(
        String(
          settingsDoc?.storefront?.checkoutSuccess?.codAdvanceNote ||
            "Thank you for your order! Pay the product amount in cash when your order arrives."
        ),
        wa.display
      );
    }
    accountLines = getAdvancePaymentAccountLines(pak);
  } else {
    title = pak[pm]?.label || pm;
    message = "Follow the payment instructions for your selected method.";
    accountLines = accountLinesForMethod(pm, pak[pm]);
    amountDue = total;
  }

  const orderRef = String(order?.orderNumber || order?._id || "").trim();
  const prefilledMessage = [
    `Hi CrazzyCars, I paid for order ${orderRef || "(new order)"}.`,
    `Amount: ${formatPrice(amountDue)}.`,
    "Sending payment screenshot now.",
  ].join("\n");
  const waMeUrl = `https://wa.me/${wa.waMeDigits}?text=${encodeURIComponent(prefilledMessage)}`;

  return {
    paymentMethod: pm,
    amountDue,
    remainingOnDelivery: isCod ? remainingCod : 0,
    currency: "PKR",
    title,
    message,
    accountLines,
    whatsapp: {
      number: wa.number,
      display: wa.display,
      waMeUrl,
      prefilledMessage,
    },
  };
}

/** True when method is a known offline key and enabled in settings. */
export function isPaymentMethodEnabled(method, settingsDoc) {
  const key = String(method || "cod").trim();
  if (!PAKISTANI_PAYMENT_METHOD_KEYS.includes(key)) return false;
  const pak = normalizePakistaniPaymentMethods(settingsDoc?.pakistaniPaymentMethods);
  return pak[key]?.enabled === true;
}
