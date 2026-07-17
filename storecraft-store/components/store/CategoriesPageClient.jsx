"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

function CategoriesPageInner({ initialCategories }) {
  const searchParams = useSearchParams();
  const parentParam = searchParams.get("parent");
  const categories = initialCategories;

  const flat = useMemo(() => {
    const out = [];
    const walk = (nodes) => {
      nodes.forEach((n) => {
        out.push(n);
        walk(n.children || []);
      });
    };
    walk(categories);
    return out;
  }, [categories]);

  const topLevel = categories.filter((c) => Number(c.level || 0) === 0);
  const subcategories = parentParam
    ? flat.filter((c) => String(c.parentCategory?._id || c.parentCategory || "") === String(parentParam))
    : [];

  return (
    <div style={{ background: "#FFFFFF", minHeight: "100vh", color: "#111111" }}>
      <div style={{ background: "linear-gradient(180deg, #F8F8F8, #FFFFFF)", padding: "24px 16px", borderBottom: "1px solid #E5E5E5" }}>
        <div className="mx-auto max-w-7xl">
            <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: "#111111", textTransform: "uppercase" }}>Shop by Category</h1>
          <p style={{ margin: "6px 0 0", color: "#555555" }}>Home / Categories</p>
        </div>
      </div>

      <div className="store-container mx-auto max-w-7xl px-4 py-8">
        <>
          <h2 className="mb-4 text-xl font-bold text-[#111111]">Top Level Categories</h2>
          <div className="categories-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
            {topLevel.map((cat) => (
              <Link key={cat._id} href={`/${cat.slug}`} style={cardLink}>
                <div
                  className="card-image-wrap"
                  style={{
                    position: "relative",
                    width: "100%",
                    paddingBottom: "100%",
                    overflow: "hidden",
                    background: "#F5F5F5",
                    borderRadius: "4px 4px 0 0",
                  }}
                >
                  {cat.image?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cat.image.url}
                      alt={cat.image?.altText || cat.name}
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
                        display: "grid",
                        placeItems: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "#888888",
                        background: "linear-gradient(135deg,#efefef,#dddddd)",
                      }}
                    >
                      Category
                    </div>
                  )}
                </div>
                <div style={{ padding: 12, background: "#FFFFFF" }}>
                  <p style={{ margin: 0, fontWeight: 700, color: "#111111" }}>{cat.name}</p>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={badgeStyle}>● {(cat.children || []).length} subcategories</span>
                    <span style={badgeStyle}>● {cat.productCount ?? 0} products</span>
                  </div>
                  <p style={{ margin: "10px 0 0", color: "#D72323", fontWeight: 600 }}>Shop Now →</p>
                </div>
              </Link>
            ))}
          </div>

          {parentParam ? (
            <div style={{ marginTop: 30 }}>
              <h2 className="mb-4 text-xl font-bold text-[#111111]">Subcategories</h2>
              {subcategories.length === 0 ? (
                <p className="text-[#555555]">No subcategories found.</p>
              ) : (
                <div className="categories-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
                  {subcategories.map((cat) => (
                    <Link key={cat._id} href={`/${cat.slug}`} style={cardLink}>
                      <div
                        className="card-image-wrap"
                        style={{
                          position: "relative",
                          width: "100%",
                          paddingBottom: "100%",
                          overflow: "hidden",
                          background: "#F5F5F5",
                          borderRadius: "4px 4px 0 0",
                        }}
                      >
                        {cat.image?.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={cat.image.url}
                            alt={cat.image?.altText || cat.name}
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
                              display: "grid",
                              placeItems: "center",
                              fontSize: 28,
                              background: "#F8F8F8",
                            }}
                          >
                            💎
                          </div>
                        )}
                      </div>
                      <div style={{ padding: 14 }}>
                        <p style={{ margin: 0, fontWeight: 700, color: "#111111" }}>{cat.name}</p>
                        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <span style={badgeStyle}>● {(cat.children || []).length} subcategories</span>
                          <span style={badgeStyle}>● {cat.productCount ?? 0} products</span>
                        </div>
                        <p style={{ margin: "10px 0 0", color: "#D72323", fontWeight: 600 }}>Shop Now →</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </>
      </div>
    </div>
  );
}

export function CategoriesPageClient({ initialCategories }) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-12 text-zinc-500">Loading categories...</div>}>
      <CategoriesPageInner initialCategories={initialCategories} />
    </Suspense>
  );
}

const cardLink = {
  border: "1px solid #E5E5E5",
  borderRadius: 12,
  overflow: "hidden",
  background: "#FFFFFF",
  textDecoration: "none",
  color: "inherit",
};
const badgeStyle = {
  fontSize: 11,
  padding: "3px 8px",
  borderRadius: 999,
  background: "#EFEFEF",
  color: "#555555",
};
