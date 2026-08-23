/**
 * Compact instrument-panel stat card — same hairline + tabular treatment as
 * dashboard KPIs, sized for list-page summary strips.
 */
export function InstrumentStatCard({
  label,
  value,
  hint,
  tone = "default",
  money = false,
}) {
  const valueColor =
    tone === "attention"
      ? "var(--accent-attention)"
      : tone === "money"
        ? "var(--accent-money)"
        : tone === "line"
          ? "var(--accent-line)"
          : "var(--text-primary)";

  return (
    <div
      className="rounded-xl border p-4 shadow-none"
      style={{
        background: "var(--bg-panel)",
        borderColor: "var(--border-hairline)",
        color: "var(--text-primary)",
      }}
    >
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </p>
      <p
        className={`mt-2 font-gauge text-2xl font-bold leading-none tracking-tight tabular-nums ${money ? "" : ""}`}
        style={{ color: valueColor }}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1.5 text-[11px] leading-snug" style={{ color: "var(--text-muted)" }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
