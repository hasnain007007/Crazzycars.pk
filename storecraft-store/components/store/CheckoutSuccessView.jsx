"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCheckoutMessages } from "@/context/StoreSettingsContext";
import { formatPrice } from "@/lib/currency";
import { oncePerSession, resolveProductContentId, trackPurchase } from "@/lib/metaPixel";
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

function CodDeliveryChargeBox({ order, storePayment, whatsapp, pakistaniPaymentMethods }) {
  const pm = String(order?.paymentMethod || "").toLowerCase();
  const shipping = Math.max(0, Number(order?.pricing?.shippingCost) || 0);
  const rules = normalizeShippingRules(storePayment);
  const advanceRequired = Math.max(0, Number(order?.payment?.advanceRequired) || 0);
  const advanceMode = String(order?.payment?.advanceMode || "");
  const advanceMaxPercent = Math.max(0, Number(order?.payment?.advanceMaxPercent) || 0);
  const remainingCod = Math.max(0, Number(order?.payment?.remainingCod) || 0);
  const showPercent = advanceMode === "percent" && advanceRequired > 0;
  const showDelivery = shouldShowAdvancePaymentMessage({
    paymentMethod: pm,
    shippingCost: shipping,
    storePayment: rules,
  });
  if (!showPercent && !showDelivery) {
    return null;
  }

  const waNum = String(whatsapp?.number || process.env.NEXT_PUBLIC_WHATSAPP || storePolicyWhatsApp()).trim();
  const waDisplay = formatWhatsAppDisplay(waNum || storePolicyWhatsApp());
  const messageBody = formatAdvancePaymentMessage(
    showPercent
      ? `Please pay at least {amount} in advance (${advanceMaxPercent}% of eligible items).\n\nRemaining on delivery: ${formatPrice(remainingCod)}.\n\nSend payment screenshot on WhatsApp: {whatsapp}`
      : rules.advancePaymentMessage,
    showPercent ? advanceRequired : rules.advancePaymentAmount || shipping || 250,
    waDisplay
  );
  const accountLines = getAdvancePaymentAccountLines(
    normalizePakistaniPaymentMethods(pakistaniPaymentMethods)
  );
  const waLink = `https://wa.me/${whatsappWaMeDigits(waNum || storePolicyWhatsApp())}`;

  return (
    <div
      style={{
        background: "#FFFBEB",
        border: "1px solid #FDE68A",
        borderLeft: "4px solid #F59E0B",
        borderRadius: 8,
        padding: "16px 20px",
        marginBottom: 28,
        textAlign: "left",
      }}
    >
      <p
        style={{
          margin: "0 0 10px",
          fontWeight: 700,
          fontSize: 15,
          color: "#92400E",
        }}
      >
        {showPercent ? `Pay at least ${advanceMaxPercent}% advance` : rules.advancePaymentMessageTitle}
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
              <strong style={{ color: "#92400E" }}>{line.label}:</strong> {line.value}
            </li>
          ))}
        </ul>
      ) : null}
      <p style={{ margin: 0, fontSize: 14, color: "#78350F", fontWeight: 700 }}>
        WhatsApp screenshot:{" "}
        <a href={waLink} target="_blank" rel="noopener noreferrer" style={{ color: "#16A34A" }}>
          {waDisplay}
        </a>
      </p>
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
    fetch("/api/settings")
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

  /** Purchase — real order grand total (pricing.total), once per order per session. */
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
      });
    });
  }, [order, orderId]);

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
        <p style={{ fontSize: 14, color: "#888888", margin: 0 }}>Loading…</p>
      </div>
    );
  }

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
          maxWidth: 520,
          width: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            background: "#f0fdf4",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 28px",
            border: "2px solid #86efac",
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 28,
            fontWeight: 700,
            color: "#111111",
            margin: "0 0 12px",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {messages.orderSuccessMessage || "Order Confirmed — Crazzycars.pk"}
        </h1>

        <p
          style={{
            fontSize: 15,
            color: "#555555",
            margin: "0 0 28px",
            lineHeight: 1.8,
          }}
        >
          {messages.orderSuccessSubtext ||
            "Thank you for shopping with Crazzycars.pk. We will deliver to your doorstep."}
        </p>

        <div
          style={{
            background: "#F8F8F8",
            border: "1px solid #E5E5E5",
            borderRadius: 8,
            padding: "20px 24px",
            marginBottom: 28,
            textAlign: "left",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
              paddingBottom: 12,
              borderBottom: "1px solid #E5E5E5",
            }}
          >
            <span style={{ fontSize: 13, color: "#888888" }}>Payment Status</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: paid ? "#16a34a" : "#92400e",
                background: paid ? "#f0fdf4" : "#fffbeb",
                padding: "3px 10px",
                borderRadius: 99,
                border: paid ? "1px solid #86efac" : "1px solid #fde68a",
              }}
            >
              {paid ? "Paid" : "Pending"}
            </span>
          </div>

          {(loading || order || orderId) && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <span style={{ fontSize: 13, color: "#888888" }}>Order Reference</span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#111111",
                  fontFamily: "monospace",
                }}
              >
                {loading && orderId ? "..." : order?.orderNumber || (orderId ? String(orderId).slice(-8).toUpperCase() : "—")}
              </span>
            </div>
          )}

          {order && (order.total != null || order.pricing?.total != null) ? (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 13, color: "#888888" }}>Order Total</span>
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#D72323",
                  fontFamily: "var(--font-price)",
                  letterSpacing: "0.05em",
                }}
              >
                {formatPrice(Number(order.total ?? order.pricing?.total ?? 0))}
              </span>
            </div>
          ) : null}
        </div>

        {order ? (
          <CodDeliveryChargeBox
            order={order}
            storePayment={contact.storePayment}
            whatsapp={contact.whatsapp}
            pakistaniPaymentMethods={contact.pakistaniPaymentMethods}
          />
        ) : null}

        {(() => {
          const method = String(order?.paymentMethod || "").toLowerCase();
          const isCod = method === "cod" || (!method && !paid);
          const noteRaw = isCod
            ? messages.codAdvanceNote || ""
            : messages.paymentConfirmedMessage || "";
          const note = applyWhatsAppPlaceholder(
            noteRaw,
            contact.whatsapp?.number || storePolicyWhatsApp()
          );
          if (!note.trim()) return null;
          return (
            <p
              style={{
                fontSize: 14,
                color: "#555555",
                margin: "0 0 20px",
                lineHeight: 1.7,
                textAlign: "left",
                background: "#F8F8F8",
                border: "1px solid #E5E5E5",
                borderRadius: 8,
                padding: "14px 16px",
              }}
            >
              {note}
            </p>
          );
        })()}

        <p
          style={{
            fontSize: 13,
            color: "#888888",
            margin: "0 0 28px",
          }}
        >
          A confirmation email has been sent to your email address.
        </p>

        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/shop"
            style={{
              padding: "13px 32px",
              background: "#111111",
              color: "#FFFFFF",
              textDecoration: "none",
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Continue Shopping
          </Link>
          <Link
            href="/account/orders"
            style={{
              padding: "13px 32px",
              background: "transparent",
              color: "#111111",
              border: "1px solid #E5E5E5",
              textDecoration: "none",
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            View Orders
          </Link>
        </div>
      </div>
    </div>
  );
}
