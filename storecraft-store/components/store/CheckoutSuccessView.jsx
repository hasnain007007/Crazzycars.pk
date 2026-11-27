"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCheckoutMessages } from "@/context/StoreSettingsContext";
import { formatPrice } from "@/lib/currency";
import { oncePerSession, resolveProductContentId, trackPurchase } from "@/lib/metaPixel";
import { ga4ItemFromProduct, ga4Purchase } from "@/lib/ga4";
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
import { normalizePakistaniPaymentMethods } from "@/lib/pakistaniPaymentMethods";
import { codBookingAmountForTotal } from "@/config/checkout-money";
import { WhatsAppPaymentButton } from "@/components/store/WhatsAppPaymentButton";
import GoogleCustomerReviewsOptIn from "@/components/store/GoogleCustomerReviewsOptIn";
import DeliveryScene from "@/components/store/DeliveryScene";
import GoogleReviewCard from "@/components/store/GoogleReviewCard";
import { CarLoader } from "@/components/store/EmptyArt";
import FounderThanksNote from "@/components/store/FounderThanksNote";

function CodDeliveryChargeBox({ order, storePayment, whatsapp, pakistaniPaymentMethods }) {
  const pm = String(order?.paymentMethod || "").toLowerCase();
  const shipping = Math.max(0, Number(order?.pricing?.shippingCost) || 0);
  const rules = normalizeShippingRules(storePayment);
  const advanceRequired = Math.max(0, Number(order?.payment?.advanceRequired) || 0);
  const advanceMode = String(order?.payment?.advanceMode || "");
  const advanceMaxPercent = Math.max(0, Number(order?.payment?.advanceMaxPercent) || 0);
  const remainingCod = Math.max(0, Number(order?.payment?.remainingCod) || 0);
  const showPercent = advanceMode === "percent" && advanceRequired > 0;
  const showBooking = advanceMode === "booking" && advanceRequired > 0;
  const showDelivery =
    !showPercent &&
    !showBooking &&
    shouldShowAdvancePaymentMessage({
      paymentMethod: pm,
      shippingCost: shipping,
      storePayment: rules,
    });
  if (!showPercent && !showBooking && !showDelivery) {
    return null;
  }

  const waNum = String(whatsapp?.number || process.env.NEXT_PUBLIC_WHATSAPP || storePolicyWhatsApp()).trim();
  const waDisplay = formatWhatsAppDisplay(waNum || storePolicyWhatsApp());
  const amount = advanceRequired > 0
    ? advanceRequired
    : shipping || codBookingAmountForTotal(order?.pricing?.total ?? order?.total);
  const messageBody = formatAdvancePaymentMessage(
    showPercent
      ? `Please pay at least {amount} in advance (${advanceMaxPercent}% of eligible items).\n\nRemaining on delivery: ${formatPrice(remainingCod)}.\n\nSend payment screenshot on WhatsApp: {whatsapp}`
      : showBooking
        ? `${rules.advancePaymentMessage || "A Rs. {amount} booking amount is required to confirm your COD order."}\n\nRemaining on delivery: ${formatPrice(remainingCod)}.`
        : rules.advancePaymentMessage,
    amount,
    waDisplay
  );
  const accountLines = getAdvancePaymentAccountLines(
    normalizePakistaniPaymentMethods(pakistaniPaymentMethods)
  );
  const orderRef = String(order?.orderNumber || order?._id || "").trim();
  const waText = encodeURIComponent(
    [
      `Hi CrazzyCars.pk, I paid the COD booking / advance for order ${orderRef || "(new order)"}.`,
      `Amount: ${formatPrice(amount)}.`,
      "Sending payment screenshot now.",
    ].join("\n")
  );
  const waLink = `https://wa.me/${whatsappWaMeDigits(waNum || storePolicyWhatsApp())}?text=${waText}`;

  return (
    <div
      style={{
        background: "#FFFBEB",
        border: "1px solid #FDE68A",
        borderLeft: "4px solid #F59E0B",
        borderRadius: 14,
        padding: "16px 18px",
        marginBottom: 16,
        textAlign: "left",
      }}
    >
      <p
        style={{
          margin: "0 0 10px",
          fontWeight: 700,
          fontSize: 15,
          color: "#78350F",
        }}
      >
        {showPercent
          ? `Pay at least ${advanceMaxPercent}% advance`
          : showBooking
            ? rules.advancePaymentMessageTitle || "Pay booking amount to confirm COD"
            : rules.advancePaymentMessageTitle || "Pay Delivery Charges to Confirm"}
      </p>
      <p
        style={{
          margin: "0 0 10px",
          fontSize: 14,
          color: "#78350F",
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
        }}
      >
        {messageBody}
      </p>
      {accountLines.length > 0 ? (
        <ul
          style={{
            margin: "0 0 10px",
            paddingLeft: 18,
            fontSize: 14,
            color: "#78350F",
            lineHeight: 1.7,
          }}
        >
          {accountLines.map((line) => (
            <li key={line.label}>
              <strong style={{ color: "#451A03" }}>{line.label}:</strong> {line.value}
            </li>
          ))}
        </ul>
      ) : null}
      <WhatsAppPaymentButton href={waLink} displayNumber={waDisplay} />
    </div>
  );
}

export default function CheckoutSuccessView() {
  const messages = useCheckoutMessages();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id") || searchParams.get("orderId");
  const accessToken = searchParams.get("t") || "";
  const paid = searchParams.get("paid") === "true";
  const paymentFailed = searchParams.get("paid") === "false";
  const [order, setOrder] = useState(null);
  const [contact, setContact] = useState({
    storePayment: null,
    whatsapp: null,
    pakistaniPaymentMethods: null,
  });
  const [loading, setLoading] = useState(true);

  const showSuccess = useMemo(() => Boolean(orderId) || paid, [orderId, paid]);
  const showFailed = paymentFailed && !orderId;

  useEffect(() => {
    fetch("/api/settings?payments=1")
      .then((r) => r.json())
      .then((body) => {
        const s = body?.data || body;
        setContact({
          storePayment: s?.storePayment,
          whatsapp: s?.whatsapp,
          pakistaniPaymentMethods: s?.pakistaniPaymentMethods,
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    const qs = accessToken ? `?t=${encodeURIComponent(accessToken)}` : "";
    fetch(`/api/orders/${orderId}/public${qs}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setOrder(data.order);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orderId, accessToken]);

  /** Purchase — Meta Pixel + GA4 (real order grand total), once per order per session. */
  useEffect(() => {
    if (!order) return;
    const orderKey = String(order._id || orderId || order.orderNumber || "").trim();
    if (!orderKey) return;
    const value = Number(order.total ?? order.pricing?.total ?? 0);
    if (!Number.isFinite(value) || value < 0) return;

    const contentIds = (Array.isArray(order.items) ? order.items : [])
      .map((it) =>
        resolveProductContentId({
          articleNo: it.articleNo,
          // Existing orders predate the articleNo snapshot; their productId is the Mongo _id.
          _id: it.productId,
        })
      )
      .filter(Boolean);
    const numItems = (Array.isArray(order.items) ? order.items : []).reduce(
      (sum, it) => sum + Math.max(1, Number(it.quantity) || 1),
      0
    );

    oncePerSession(`meta_purchase_${orderKey}`, () => {
      trackPurchase({
        contentIds,
        value,
        orderId: order.orderNumber || orderKey,
        numItems: numItems || undefined,
        eventId: String(order.metaPurchaseEventId || "").trim() || undefined,
        // Server already sent CAPI Purchase at checkout with this event_id.
        skipCapi: true,
      });
    });

    oncePerSession(`ga4_purchase_${orderKey}`, () => {
      const items = (Array.isArray(order.items) ? order.items : []).map((it) =>
        ga4ItemFromProduct(
          {
            articleNo: it.articleNo,
            sku: it.sku,
            name: it.name,
            id: it.productId,
          },
          {
            quantity: it.quantity,
            price: it.unitPrice ?? it.price,
          }
        )
      );
      ga4Purchase({
        transactionId: order.orderNumber || orderKey,
        value,
        shipping: order.pricing?.shipping ?? order.shipping,
        tax: order.pricing?.tax ?? order.tax,
        items,
      });
    });
  }, [order, orderId]);

  const gcrPayload = order?.googleCustomerReviews || null;

  if (showFailed) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 24px",
        }}
      >
        <div
          style={{
            maxWidth: 480,
            width: "100%",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              background: "#fef2f2",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              border: "2px solid #fecaca",
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 24,
              fontWeight: 700,
              color: "#111111",
              margin: "0 0 12px",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
            }}
          >
            {messages.failedTitle || "Payment Failed"}
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "#555555",
              margin: "0 0 32px",
              lineHeight: 1.7,
            }}
          >
            {messages.failedMessage || "Your payment could not be processed. Please try again or contact us for help."}
          </p>
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              onClick={() => window.history.back()}
              style={{
                padding: "12px 28px",
                background: "#111111",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
            <Link
              href="/shop"
              style={{
                padding: "12px 28px",
                background: "transparent",
                color: "#111111",
                border: "1px solid #E5E5E5",
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!showSuccess) {
    return (
      <div
        style={{
          minHeight: "40vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
        }}
      >
        <CarLoader label="Loading your order…" />
      </div>
    );
  }

  const pm = String(order?.paymentMethod || "").toLowerCase();
  const isCod = pm === "cod" || (!pm && !paid);
  const orderRef =
    loading && orderId ? "…" : order?.orderNumber || (orderId ? String(orderId).slice(-8).toUpperCase() : "—");
  const placedAt = order?.createdAt
    ? new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "";
  const total = Number(order?.total ?? order?.pricing?.total ?? 0);
  const pricing = order?.pricing || {};
  const items = Array.isArray(order?.items) ? order.items : [];
  const advance = Math.max(0, Number(order?.payment?.advanceRequired) || 0);
  const remaining = Math.max(0, Number(order?.payment?.remainingCod) || 0);
  const waNumber = contact.whatsapp?.number || storePolicyWhatsApp();
  const helpLink = `https://wa.me/${whatsappWaMeDigits(waNumber)}?text=${encodeURIComponent(
    `Hi CrazzyCars.pk, I have a question about my order ${orderRef}.`
  )}`;
  const paymentNote = applyWhatsAppPlaceholder(
    isCod ? messages.codAdvanceNote || "" : messages.paymentConfirmedMessage || "",
    waNumber
  );

  return (
    <div className="osp">
      {/* 1 — Confirmation */}
      <header className="osp-hero">
        <span className="osp-check" aria-hidden="true">
          <svg viewBox="0 0 52 52">
            <circle className="osp-check__ring" cx="26" cy="26" r="24" />
            <path className="osp-check__tick" d="M15 27l7.5 7.5L38 19" />
          </svg>
        </span>
        <p className="osp-kicker">Shukriya! · Order {orderRef}</p>
        <h1 className="osp-title">{messages.orderSuccessMessage || "Order placed successfully"}</h1>
        <p className="osp-sub">
          {messages.orderSuccessSubtext || "Thank you for shopping with CrazzyCars.pk. We will deliver to your doorstep."}
        </p>
        <ul className="osp-meta">
          <li>
            <span>Order number</span>
            <strong>{orderRef}</strong>
          </li>
          {placedAt ? (
            <li>
              <span>Date</span>
              <strong>{placedAt}</strong>
            </li>
          ) : null}
          {order ? (
            <li>
              <span>Total</span>
              <strong>{formatPrice(total)}</strong>
            </li>
          ) : null}
          <li>
            <span>Payment</span>
            <strong>{isCod ? "Cash on delivery" : paid ? "Paid online" : "Online / bank"}</strong>
          </li>
        </ul>
      </header>

      <div className="osp-grid">
        {/* 2 — Parcel journey */}
        <section className="osp-journey" aria-labelledby="osp-journey-h">
          <h2 className="osp-h2" id="osp-journey-h">
            Your parcel’s journey
          </h2>
          <DeliveryScene city={order?.shippingCity || ""} cod={isCod} advanceDue={advance > 0 && !paid} />
        </section>

        {/* 3 — Order details (next action first, then the summary) */}
        <section className="osp-details" aria-labelledby="osp-summary-h">
          {order ? (
            <CodDeliveryChargeBox
              order={order}
              storePayment={contact.storePayment}
              whatsapp={contact.whatsapp}
              pakistaniPaymentMethods={contact.pakistaniPaymentMethods}
            />
          ) : null}
          {/* The amber advance box already says this for COD orders with a booking advance. */}
          {paymentNote.trim() && !(isCod && advance > 0 && !paid) ? <p className="osp-paynote">{paymentNote}</p> : null}

          <div className="osp-card">
            <div className="osp-card__head">
              <h2 className="osp-h2" id="osp-summary-h">
                Order summary
              </h2>
              <span className={`osp-pill ${paid ? "osp-pill--ok" : "osp-pill--wait"}`}>
                {paid ? "Paid" : "Payment pending"}
              </span>
            </div>

            {items.length ? (
              <ul className="osp-items">
                {items.map((it, i) => (
                  <li key={`${it.productId || it.name}-${i}`}>
                    <span className="osp-items__img">
                      {it.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.image} alt="" width={56} height={56} loading="lazy" decoding="async" />
                      ) : null}
                      <b>{it.quantity}</b>
                    </span>
                    <span className="osp-items__name">{it.name}</span>
                    <span className="osp-items__price">{formatPrice(Number(it.total) || Number(it.unitPrice) * it.quantity)}</span>
                  </li>
                ))}
              </ul>
            ) : loading ? (
              <p className="osp-muted">Loading items…</p>
            ) : null}

            {order ? (
              <dl className="osp-totals">
                <div>
                  <dt>Subtotal</dt>
                  <dd>{formatPrice(Number(pricing.subtotal) || 0)}</dd>
                </div>
                <div>
                  <dt>Delivery</dt>
                  <dd>{formatPrice(Number(pricing.shippingCost) || 0)}</dd>
                </div>
                {Number(pricing.discount) > 0 ? (
                  <div className="osp-totals__save">
                    <dt>Discount</dt>
                    <dd>−{formatPrice(Number(pricing.discount))}</dd>
                  </div>
                ) : null}
                <div className="osp-totals__total">
                  <dt>Total</dt>
                  <dd>{formatPrice(total)}</dd>
                </div>
                {isCod && advance > 0 && !paid ? (
                  <>
                    <div className="osp-totals__split">
                      <dt>Booking advance (now)</dt>
                      <dd>{formatPrice(advance)}</dd>
                    </div>
                    <div className="osp-totals__split">
                      <dt>Pay on delivery</dt>
                      <dd>{formatPrice(remaining || Math.max(0, total - advance))}</dd>
                    </div>
                  </>
                ) : null}
              </dl>
            ) : null}
            <p className="osp-muted">A confirmation email has been sent to your email address.</p>
          </div>
        </section>

        {/* 4 — Customer care */}
        <section className="osp-care" aria-labelledby="osp-care-h">
          <h2 className="osp-h2" id="osp-care-h">
            Need help with your order?
          </h2>
          <div className="osp-care__row">
            <a className="osp-btn osp-btn--wa" href={helpLink} target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor">
                <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3a.5.5 0 0 0 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.1-.2-.2-.5-.3z" />
              </svg>
              Chat on WhatsApp
            </a>
            <Link className="osp-btn osp-btn--ghost" href={`/track-order?tracking=${encodeURIComponent(order?.orderNumber || "")}`}>
              Track order
            </Link>
          </div>
          <FounderThanksNote />
          <GoogleReviewCard variant="after-order" />
          <div className="osp-actions">
            <Link className="osp-btn osp-btn--primary" href="/shop">
              Continue shopping
            </Link>
            <Link className="osp-btn osp-btn--ghost" href="/account/orders">
              View my orders
            </Link>
          </div>
        </section>
      </div>
      {gcrPayload ? <GoogleCustomerReviewsOptIn payload={gcrPayload} /> : null}
    </div>
  );
}
