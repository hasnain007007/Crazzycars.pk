"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ProductCard } from "./ProductCard";

/** Maps category-page product documents to the flat shape ProductCard + /api/products use. */
function toProductCard(product) {
  const regularPrice = Number(product.pricing?.regularPrice ?? product.regularPrice ?? product.price ?? 0);
  const salePrice = Number(product.pricing?.salePrice ?? product.salePrice ?? 0);
  return {
    id: product._id,
    slug: product.slug,
    name: product.name,
    media: product.media,
    image: product.media?.images?.[0]?.url || "",
    regularPrice,
    salePrice,
    price: salePrice > 0 && salePrice < regularPrice ? salePrice : regularPrice,
    inventory: product.inventory,
    newArrival: Boolean(product.newArrival),
    createdAt: product.createdAt,
  };
}

export function CategoryDetailPageClient({ initialCategory, initialSubcategories, initialProducts, initialBreadcrumbs: _initialBreadcrumbs }) {
  const [sortBy, setSortBy] = useState("default");
  const category = initialCategory;
  const subcategories = initialSubcategories || [];
  const products = initialProducts || [];

  const sortedProducts = useMemo(() => {
    const rows = [...products];
    if (sortBy === "price-asc") rows.sort((a, b) => Number(a.pricing?.regularPrice || 0) - Number(b.pricing?.regularPrice || 0));
    if (sortBy === "price-desc") rows.sort((a, b) => Number(b.pricing?.regularPrice || 0) - Number(a.pricing?.regularPrice || 0));
    if (sortBy === "newest") rows.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return rows;
  }, [products, sortBy]);

  if (!category) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-14 text-center">
        <h1 className="text-3xl font-bold">Category not found</h1>
        <Link href="/categories" className="mt-5 inline-block text-[#D4AF37] underline">
          Back to categories
        </Link>
      </div>
    );
  }

  return (
    <div style={{ background: "#FFFFFF", minHeight: "100vh" }}>
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "32px 24px 0",
        }}
      >
        <p
          style={{
            fontSize: 11,
            color: "#888888",
            margin: "0 0 16px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <a href="/" style={{ color: "#888888", textDecoration: "none" }}>
            Home
          </a>
          {" / "}
          <a href="/categories" style={{ color: "#888888", textDecoration: "none" }}>
            Categories
          </a>
          {" / "}
          <span style={{ color: "#111111" }}>{category.name}</span>
        </p>

        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(24px, 3vw, 36px)",
            fontWeight: 700,
            color: "#111111",
            margin: "0 0 12px",
            letterSpacing: "-0.01em",
            textAlign: "center",
          }}
        >
          {category.name}
        </h1>

        {category.description ? (
          <div
            style={{
              fontSize: 14,
              color: "#555555",
              lineHeight: 1.8,
              width: "100%",
              maxWidth: "100%",
              margin: "0 0 24px",
              textAlign: "left",
            }}
            dangerouslySetInnerHTML={{ __html: category.description }}
          />
        ) : null}
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {subcategories.length > 0 ? (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111111", marginBottom: 16 }}>Explore Subcategories</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
              {subcategories.map((sub) => (
                <Link key={sub._id} href={`/${sub.slug}`} style={{ textDecoration: "none" }}>
                  <div
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #E5E5E5",
                      borderRadius: 10,
                      overflow: "hidden",
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    <div
                      className="card-image-wrap"
                      style={{
                        position: "relative",
                        width: "100%",
                        paddingBottom: "100%",
                        overflow: "hidden",
                        background: "#F5F5F5",
                      }}
                    >
                      {sub.image?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={sub.image.url}
                          alt={sub.image?.altText || sub.name}
                          className="category-image"
                          loading="lazy"
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            objectPosition: "center",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 36,
                            background: "#F8F8F8",
                          }}
                        >
                          💎
                        </div>
                      )}
                    </div>
                    <div style={{ padding: 12 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#111111", margin: 0 }}>{sub.name}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111111", margin: 0 }}>
            {sortedProducts.length > 0 ? `${sortedProducts.length} Products` : "No products yet"}
          </h2>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ border: "1px solid #E5E5E5", borderRadius: 8, padding: "9px 12px", fontSize: 14, color: "#111111" }}>
            <option value="default">Default</option>
            <option value="price-asc">Price Low-High</option>
            <option value="price-desc">Price High-Low</option>
            <option value="newest">Newest</option>
          </select>
        </div>

        {sortedProducts.length > 0 ? (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {sortedProducts.map((product) => (
              <div key={String(product._id)}>
                <ProductCard product={toProductCard(product)} />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "60px 24px", color: "#888888" }}>
            <p style={{ fontSize: 16, margin: "0 0 16px" }}>No products found in this category.</p>
            <Link
              href="/products"
              style={{
                display: "inline-block",
                padding: "12px 28px",
                background: "#111111",
                color: "#FFFFFF",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                borderRadius: 4,
              }}
            >
              View All Products
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
