/**
 * Server-rendered categories index chrome — always emits one H1 for crawlers.
 */
export function CategoriesIndexChrome() {
  return (
    <div
      style={{
        background: "linear-gradient(180deg, #F8F8F8, #FFFFFF)",
        padding: "24px 16px",
        borderBottom: "1px solid #E5E5E5",
      }}
    >
      <div className="mx-auto max-w-7xl">
        <h1
          style={{
            margin: 0,
            fontSize: 32,
            fontWeight: 800,
            color: "#111111",
            textTransform: "uppercase",
          }}
        >
          Shop by Category
        </h1>
        <p style={{ margin: "6px 0 0", color: "#555555" }}>Home / Categories</p>
      </div>
    </div>
  );
}
