import Link from "next/link";
import { headers } from "next/headers";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import Order from "@/lib/models/Order.model";
import Settings from "@/lib/models/Settings.model";
import { verifyReviewRequestToken } from "@/lib/reviewRequestToken";
import { OrderReviewForm } from "@/components/store/OrderReviewForm";
import { withSafeMetadata } from "@/lib/safeMetadata";
import { BRAND_NAME } from "@/lib/brand";
import { WHATSAPP_URL, PHONE_DISPLAY } from "@/lib/contact";

export const dynamic = "force-dynamic";

export const generateMetadata = withSafeMetadata(async function reviewMeta() {
  return {
    title: { absolute: `Leave a review | ${BRAND_NAME}` },
    robots: { index: false, follow: false },
    other: {
      "x-robots-tag": "noindex, nofollow",
    },
  };
});

function FriendlyUnavailable({ message }) {
  return (
    <div className="store-container" style={{ padding: "48px 16px", maxWidth: 560 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Review link unavailable</h1>
      <p style={{ marginTop: 12, color: "#555" }}>{message}</p>
      <p style={{ marginTop: 16, color: "#555" }}>
        Message us on WhatsApp{" "}
        <a href={WHATSAPP_URL} style={{ color: "#16A34A", fontWeight: 600 }}>
          {PHONE_DISPLAY}
        </a>{" "}
        and we will send a fresh link.
      </p>
      <p style={{ marginTop: 16 }}>
        <Link href="/" style={{ color: "#C41E1E", fontWeight: 600 }}>
          Back to store
        </Link>
      </p>
    </div>
  );
}

export default async function OrderReviewByTokenPage({ params, searchParams }) {
  const h = await headers();
  // Private + noindex for review landing pages.
  void h;

  const { token: rawToken } = await params;
  const sp = await searchParams;
  const pathToken = decodeURIComponent(String(rawToken || "").trim());
  const queryToken = String(sp?.t || "").trim();

  // Support opaque /review/<token> and legacy /review/<orderId>?t=<token>.
  let orderId = null;
  let token = pathToken;

  if (mongoose.Types.ObjectId.isValid(pathToken) && queryToken) {
    orderId = pathToken;
    token = queryToken;
    const check = verifyReviewRequestToken(token, orderId);
    if (!check.ok) return <FriendlyUnavailable message={check.error} />;
  } else {
    const check = verifyReviewRequestToken(pathToken);
    if (!check.ok) return <FriendlyUnavailable message={check.error} />;
    orderId = check.orderId;
    token = pathToken;
  }

  if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
    return <FriendlyUnavailable message="Invalid link." />;
  }

  await dbConnect();
  const [order, settings] = await Promise.all([
    Order.findById(orderId)
      .select("orderNumber orderStatus items customer shippingAddress")
      .lean(),
    Settings.findOne({ singletonKey: "default" }).select("general").lean(),
  ]);
  if (!order) return <FriendlyUnavailable message="We could not find that order." />;

  const status = String(order.orderStatus || "").toLowerCase();
  if (status && status !== "delivered" && status !== "completed") {
    return (
      <div className="store-container" style={{ padding: "48px 16px", maxWidth: 560 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Almost there</h1>
        <p style={{ marginTop: 12, color: "#555" }}>
          Reviews unlock after your order is marked delivered. If you just received your parcel,
          message us on WhatsApp {PHONE_DISPLAY} and we will send a fresh link.
        </p>
        <p style={{ marginTop: 16 }}>
          <Link href="/" style={{ color: "#C41E1E", fontWeight: 600 }}>
            Back to store
          </Link>
        </p>
      </div>
    );
  }

  const products = (order.items || [])
    .map((it) => ({
      productId: it.product ? String(it.product) : "",
      slug: String(it.slug || it.productSlug || "").trim(),
      name: String(it.name || it.title || "Product").trim(),
      image: String(it.image || "").trim(),
    }))
    .filter((p) => p.productId || p.slug);

  const first = String(order.customer?.firstName || "").trim();
  const last = String(order.customer?.lastName || "").trim();
  const customerName =
    [first, last ? `${last.charAt(0)}.` : ""].filter(Boolean).join(" ").trim() ||
    order.customer?.name ||
    "";
  const city = String(order.shippingAddress?.city || "").trim();
  const googleReviewUrl = String(settings?.general?.googleReviewUrl || "").trim();

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <head>
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <div className="store-container" style={{ padding: "40px 16px 64px", maxWidth: 640 }}>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "#C41E1E",
          }}
        >
          ORDER #{order.orderNumber || orderId.slice(-6)}
        </p>
        <h1 style={{ margin: "8px 0 0", fontSize: 26, fontWeight: 700 }}>
          Rate your order #{order.orderNumber || orderId.slice(-6)}
        </h1>
        <p style={{ margin: "10px 0 0", color: "#555", lineHeight: 1.55 }}>
          Pick a product, leave stars and an optional note. Reviews appear after our team approves
          them — only real delivered orders are shown on product pages.
        </p>
        <OrderReviewForm
          orderId={orderId}
          token={token}
          products={products}
          defaultName={customerName}
          defaultLocation={city}
          googleReviewUrl={googleReviewUrl}
        />
      </div>
    </>
  );
}
