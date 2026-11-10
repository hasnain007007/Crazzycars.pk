/**
 * Server-rendered categories index chrome — always emits one H1 for crawlers.
 * @param {{ intro?: string }} [props]
 */
export function CategoriesIndexChrome({ intro = "" } = {}) {
  const blurb =
    String(intro || "").trim() ||
    "Browse car accessory categories for exterior styling, interior upgrades, LED lighting, floor mats, and more. Open a category to see live stock, then confirm vehicle fitment on each product page. Cash on Delivery is available on eligible items; delivery is Rs 250 standard or Rs 500 when the cart includes bulky lines.";

  return (
    <div
      className="cat-index-chrome"
      style={{
        background: "linear-gradient(180deg, #F8F8F8, #FFFFFF)",
        padding: "16px 16px",
        borderBottom: "1px solid #E5E5E5",
      }}
    >
      <div className="mx-auto max-w-7xl">
        <h1
          className="font-heading text-xl font-extrabold uppercase md:text-[32px]"
          style={{
            margin: 0,
            color: "#111111",
          }}
        >
          Shop by Category
        </h1>
        <p className="mt-1 text-sm text-[#555555] md:mt-1.5">Home / Categories</p>
        <p
          className="mt-3 max-w-3xl text-sm leading-relaxed text-[#374151] md:text-[15px]"
          style={{ marginBottom: 0 }}
        >
          {blurb}
        </p>
      </div>
    </div>
  );
}
