/**
 * Server-rendered categories index chrome — always emits one H1 for crawlers.
 */
export function CategoriesIndexChrome() {
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
      </div>
    </div>
  );
}
