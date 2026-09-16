"use client";

import Link from "next/link";
import toast from "react-hot-toast";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/currency";
import { productPath } from "@/lib/productPath";
import { productAllowsCod } from "@/lib/codEligibility";

function lineProductId(item) {
  return String(item?._id || item?.id || item?.productId || "");
}

/**
 * Compact cross-sell row above Add to Cart — + Add puts the item in the cart
 * and updates the running total; checkout stays the visitor's choice.
 */
export function RecommendedProductsQuickAdd({ products = [] }) {
  const { addItem, subtotal, items, cartCount } = useCart();
  const list = Array.isArray(products) ? products.filter((p) => p?.slug && p?.name) : [];
  if (!list.length) return null;

  const addedFromHere = list.some((rec) => {
    const id = String(rec.id || rec._id || "");
    return id && items.some((line) => lineProductId(line) === id);
  });

  function qtyInCart(rec) {
    const id = String(rec.id || rec._id || "");
    if (!id) return 0;
    return items
      .filter((line) => lineProductId(line) === id && !line.variationLabel)
      .reduce((sum, line) => sum + (Number(line.quantity) || 1), 0);
  }

  function handleAdd(rec) {
    if (rec.requiresOptions) {
      toast("This item has options — open it to choose, then add.");
      return;
    }
    if (rec.inStock === false) {
      toast.error("That item is out of stock.");
      return;
    }
    const unitPrice = Number(rec.price) || 0;
    addItem({
      productId: rec.id || rec._id,
      _id: rec.id || rec._id,
      slug: rec.slug,
      name: rec.name,
      image: rec.image || rec.images?.[0] || "",
      unitPrice,
      price: unitPrice,
      quantity: 1,
      articleNo: rec.articleNo || "",
      sku: rec.articleNo || "",
      categoryIds: (rec.categories || [])
        .map((c) => String(c?.id || c?._id || c || "").trim())
        .filter(Boolean),
      codEnabled: productAllowsCod(rec),
      isBulky: rec.isBulky === true,
      advancePercentRequired: Math.min(100, Math.max(0, Number(rec.advancePercentRequired) || 0)),
      openCart: false,
    });

    const nextSubtotal = Math.round((subtotal + unitPrice) * 100) / 100;
    toast.success(
      `Added ${rec.name}. Cart total ${formatPrice(nextSubtotal)} — checkout when you're ready.`,
      { duration: 4500 }
    );
  }

  return (
    <div className="pdp-recommended" style={{ margin: "4px 0 12px" }}>
      <p
        style={{
          margin: "0 0 8px",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.02em",
          color: "var(--primary, #b91c1c)",
        }}
      >
        Recommended Products
      </p>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {list.map((rec) => {
          const href = productPath(rec);
          const needsOptions = Boolean(rec.requiresOptions);
          const oos = rec.inStock === false;
          const inCart = qtyInCart(rec);
          return (
            <li
              key={rec.id || rec.slug}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                border: "1px solid #E5E5E5",
                borderRadius: 8,
                background: inCart ? "#F0FDF4" : "#fff",
              }}
            >
              <Link href={href} style={{ flexShrink: 0 }}>
                {rec.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={rec.image}
                    alt={rec.name}
                    width={48}
                    height={48}
                    style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6, display: "block" }}
                  />
                ) : (
                  <span
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 6,
                      background: "#F3F4F6",
                      display: "block",
                    }}
                  />
                )}
              </Link>
              <div style={{ minWidth: 0, flex: 1 }}>
                <Link
                  href={href}
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#111",
                    textDecoration: "none",
                    lineHeight: 1.3,
                  }}
                >
                  {rec.name}
                </Link>
                <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 700, color: "#111" }}>
                  {formatPrice(rec.price)}
                  {rec.isOnSale && rec.regularPrice > rec.price ? (
                    <span
                      style={{
                        marginLeft: 6,
                        fontWeight: 500,
                        color: "#9ca3af",
                        textDecoration: "line-through",
                      }}
                    >
                      {formatPrice(rec.regularPrice)}
                    </span>
                  ) : null}
                </p>
                {inCart > 0 ? (
                  <p style={{ margin: "2px 0 0", fontSize: 11, fontWeight: 600, color: "#15803d" }}>
                    In cart · qty {inCart}
                  </p>
                ) : null}
              </div>
              {needsOptions ? (
                <Link
                  href={href}
                  style={{
                    flexShrink: 0,
                    padding: "6px 12px",
                    borderRadius: 6,
                    background: "#F3F4F6",
                    color: "#111",
                    fontSize: 13,
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  View
                </Link>
              ) : (
                <button
                  type="button"
                  disabled={oos}
                  onClick={() => handleAdd(rec)}
                  style={{
                    flexShrink: 0,
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "none",
                    background: oos ? "#E5E5E5" : inCart ? "#DCFCE7" : "#DBEAFE",
                    color: oos ? "#6b7280" : inCart ? "#166534" : "#1D4ED8",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: oos ? "not-allowed" : "pointer",
                  }}
                >
                  {oos ? "Sold out" : inCart ? "+ Add again" : "+ Add"}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {addedFromHere || cartCount > 0 ? (
        <div
          style={{
            marginTop: 10,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #BFDBFE",
            background: "#EFF6FF",
          }}
        >
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1e3a8a" }}>
            Cart total: {formatPrice(subtotal)}
            {cartCount > 0 ? (
              <span style={{ fontWeight: 500, color: "#475569" }}> · {cartCount} item{cartCount === 1 ? "" : "s"}</span>
            ) : null}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 12, lineHeight: 1.4, color: "#475569" }}>
            Items stay in your cart — add more or use <strong>Add to cart</strong> below, then checkout when
            you&apos;re ready.
          </p>
          <Link
            href="/checkout"
            style={{
              display: "inline-block",
              marginTop: 8,
              fontSize: 12,
              fontWeight: 700,
              color: "#1D4ED8",
              textDecoration: "underline",
            }}
          >
            Go to checkout
          </Link>
        </div>
      ) : null}
    </div>
  );
}
