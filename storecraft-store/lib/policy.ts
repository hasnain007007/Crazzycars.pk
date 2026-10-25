/**
 * One source for COD / delivery / returns customer-facing wording.
 * Booking-advance amounts come from checkout-money (official /advance-payment tiers).
 * FLAG FOR OWNER: defaults use the checkout-money tier floor (not legacy FAQ amounts). Confirm before marketing.
 */
import { STORE_POLICY } from "@/config/store-policy";
import {
  COD_ADVANCE_AMOUNT,
  COD_ADVANCE_TIERS,
} from "@/config/checkout-money";
import { PHONE_DISPLAY } from "@/lib/contact";

function formatPkr(n: number) {
  return `Rs. ${Number(n).toLocaleString("en-PK")}`;
}

/** Structured booking-advance tiers (official payment page). */
export const bookingAdvanceTiers = COD_ADVANCE_TIERS.map((t, i, arr) => {
  const from = i === 0 ? 0 : Number(arr[i - 1].below) || 0;
  return {
    amount: t.amount,
    below: t.below,
    from,
    label:
      t.below == null
        ? `${formatPkr(from)} and above`
        : from === 0
          ? `Under ${formatPkr(t.below)}`
          : `${formatPkr(from)} – ${formatPkr(Number(t.below) - 1)}`,
  };
});

export function bookingAdvanceFromAmount() {
  return COD_ADVANCE_AMOUNT;
}

export function bookingAdvanceTiersSummary() {
  return bookingAdvanceTiers
    .map((t) => `${formatPkr(t.amount)} (${t.label.replace(/^Under /, "under ")})`)
    .join(" · ");
}

const regular = () => formatPkr(STORE_POLICY.shipping.standardFeePKR);
const bulky = () => formatPkr(STORE_POLICY.shipping.bulkyFeePKR || 500);
const windowDays = () => STORE_POLICY.returns.windowDays;
const fromAdvance = () => formatPkr(bookingAdvanceFromAmount());

/** Short COD line for FAQs / cards. */
export function COD_SHORT() {
  return `COD needs a small booking advance (from ${fromAdvance()}); balance on delivery.`;
}

/**
 * Long COD explanation — official advance-payment wording.
 * Owner flag: amounts match /advance-payment tiers, not older FAQ copy that used the delivery fee as the advance floor.
 */
export function COD_LONG() {
  return `Cash on Delivery is available nationwide on eligible items. After you place the order, pay a small booking advance (from ${fromAdvance()} by order total — ${bookingAdvanceTiersSummary()}). It is deducted from your total and refunded if the item doesn't fit. The balance is collected on delivery. Body kits and some large packages may require a higher advance — checkout shows the exact amount. Send your payment screenshot on WhatsApp ${PHONE_DISPLAY}.`;
}

export function DELIVERY_SHORT() {
  return `Delivery is ${regular()} for regular items, or ${bulky()} when the order includes bulky items (splitters, side skirts, spoilers, floor mats, body kits). Spoilers and Express may use the rate shown at checkout.`;
}

export function RETURNS_SHORT() {
  return `Returns within ${windowDays()} days if the item arrives defective or we sent the wrong item — full refund. Change of mind is not eligible for return, refund, or exchange.`;
}

/** Combined delivery + COD line for policy pages (replaces scattered conflicting advance/fee copy). */
export function DELIVERY_AND_COD_STATEMENT() {
  return `${DELIVERY_SHORT()} COD orders require a booking advance (from ${fromAdvance()}); the balance is Cash on Delivery. There is no order-value waiver for delivery.`;
}

export const POLICY_COPY = {
  get COD_SHORT() {
    return COD_SHORT();
  },
  get COD_LONG() {
    return COD_LONG();
  },
  get DELIVERY_SHORT() {
    return DELIVERY_SHORT();
  },
  get RETURNS_SHORT() {
    return RETURNS_SHORT();
  },
  get DELIVERY_AND_COD() {
    return DELIVERY_AND_COD_STATEMENT();
  },
};
