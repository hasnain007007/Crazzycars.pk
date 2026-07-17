export default function StatsBar() {
  const stats = [
    { value: "10,000+", label: "Happy Customers" },
    { value: "500+", label: "Products" },
    { value: "5 Years", label: "Experience" },
    { value: "100%", label: "Genuine Products" },
  ];

  return (
    <section style={{ background: "#111111" }}>
      <div className="store-container py-6 md:py-5">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {stats.map((item, i) => (
            <div
              key={item.label}
              className="flex min-h-[80px] flex-col items-center justify-center text-center"
              style={{
                borderRight: i !== stats.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none",
                borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.08)" : "none",
              }}
            >
              <p className="font-heading text-[28px] font-bold md:text-[32px]" style={{ color: "#C41E1E" }}>
                {item.value}
              </p>
              <p className="text-[13px]" style={{ color: "#9CA3AF" }}>
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
