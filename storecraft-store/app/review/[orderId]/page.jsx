import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import Order from "@/lib/models/Order.model";
import { verifyReviewRequestToken } from "@/lib/reviewRequestToken";
import { OrderReviewForm } from "@/components/store/OrderReviewForm";
import { withSafeMetadata } from "@/lib/safeMetadata";
import { BRAND_NAME } from "@/lib/brand";

export const dynamic = "force-dynamic";

export const generateMetadata = withSafeMetadata(async function reviewMeta() {
  return {
    title: { absolute: `Leave a review | ${BRAND_NAME}` },
    robots: { index: false, follow: false },
  };
});

export default async function OrderReviewPage({ params, searchParams }) {
  const { orderId } = await params;
  const sp = await searchParams;
  const token = String(sp?.t || "").trim();
  const id = String(orderId || "").trim();

  if (!mongoose.Types.ObjectId.isValid(id) || !token) {
    notFound();
  }

  const check = verifyReviewRequestToken(token, id);
  if (!check.ok) {
    return (
      <div className="store-container" style={{ padding: "48px 16px", maxWidth: 560 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Review link unavailable</h1>
        <p style={{ marginTop: 12, color: "#555" }}>{check.error}</p>
        <p style={{ marginTop: 16 }}>
          <Link href="/" style={{ color: "#C41E1E", fontWeight: 600 }}>
            Back to store
          </Link>
        </p>
      </div>
    );
  }

  await dbConnect();
  const order = await Order.findById(id)
    .select("orderNumber orderStatus items customer shippingAddress")
    .lean();
  if (!order) notFound();

  const status = String(order.orderStatus || "").toLowerCase();
  if (status && status !== "delivered" && status !== "completed") {
    return (
      <div className="store-container" style={{ padding: "48px 16px", maxWidth: 560 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Almost there</h1>
        <p style={{ marginTop: 12, color: "#555" }}>
          Reviews unlock after your order is marked delivered. If you just received your parcel,
          message us on WhatsApp and we will send a fresh link.
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

  const customerName =
    [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(" ").trim() ||
    order.customer?.name ||
    "";
  const city = String(order.shippingAddress?.city || "").trim();

  return (
    <div className="store-container" style={{ padding: "40px 16px 64px", maxWidth: 640 }}>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "#C41E1E" }}>
        ORDER #{order.orderNumber || id.slice(-6)}
      </p>
      <h1 style={{ margin: "8px 0 0", fontSize: 26, fontWeight: 700 }}>How was your order?</h1>
      <p style={{ margin: "10px 0 0", color: "#555", lineHeight: 1.55 }}>
        Pick a product, leave stars and a short note. Reviews appear after our team approves them —
        only real delivered orders are shown on product pages.
      </p>
      <OrderReviewForm
        orderId={id}
        token={token}
        products={products}
        defaultName={customerName}
        defaultLocation={city}
      />
    </div>
  );
}
