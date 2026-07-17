"use client";

const ORDER_STEPS = [
  { key: "placed", label: "Order Placed", icon: "📦" },
  { key: "processing", label: "Processing", icon: "⚙️" },
  { key: "packed", label: "Packed", icon: "📫" },
  { key: "shipped", label: "Shipped", icon: "🚚" },
  { key: "delivered", label: "Delivered", icon: "✅" },
];

function statusProgressIndex(orderStatus) {
  const s = String(orderStatus || "pending").toLowerCase();
  if (s === "cancelled" || s === "refunded" || s === "disputed") return -2;
  if (s === "pending" || s === "confirmed" || s === "placed") return 0;
  if (s === "processing") return 1;
  if (s === "packed") return 2;
  if (s === "shipped") return 3;
  if (s === "delivered") return 4;
  return 0;
}

function mapStepToOrderStatus(stepKey) {
  if (stepKey === "placed") return "pending";
  return stepKey;
}

export default function OrderTimeline({ order, onStatusChange }) {
  const currentStatus = order?.orderStatus || "pending";
  const timeline = order?.timeline || [];
  const emailHistory = order?.emailHistory || [];

  const cancelled = currentStatus === "cancelled" || currentStatus === "refunded";
  const currentIdx = statusProgressIndex(currentStatus);
  const maxIdx = ORDER_STEPS.length - 1;

  const getStepStatus = (stepKey) => {
    const stepIndex = ORDER_STEPS.findIndex((st) => st.key === stepKey);
    if (cancelled) return "upcoming";
    if (currentIdx < 0) return "upcoming";
    if (stepIndex < currentIdx) return "completed";
    if (stepIndex === currentIdx) return "current";
    return "upcoming";
  };

  const getStepTime = (stepKey) => {
    if (stepKey === "placed") {
      const placed = timeline.find((t) => t.status === "placed");
      if (placed?.timestamp) return new Date(placed.timestamp);
      const pend = timeline.find((t) => t.status === "pending");
      if (pend?.timestamp) return new Date(pend.timestamp);
      if (order?.createdAt) return new Date(order.createdAt);
      return null;
    }
    const entry = timeline.find((t) => t.status === stepKey);
    if (!entry?.timestamp) return null;
    return new Date(entry.timestamp);
  };

  const progressPct = (() => {
    if (cancelled) return 100;
    if (currentIdx < 0) return 0;
    if (maxIdx <= 0) return 0;
    return (currentIdx / maxIdx) * 100;
  })();

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 24,
        marginBottom: 20,
      }}
      className="dark:border-slate-700 dark:bg-slate-900"
    >
      <h3
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "#111827",
          margin: "0 0 24px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
        className="dark:text-white"
      >
        📊 Order Progress
      </h3>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          marginBottom: 32,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 20,
            left: "10%",
            right: "10%",
            height: 3,
            background: "#E5E7EB",
            zIndex: 0,
          }}
        >
          <div
            style={{
              height: "100%",
              background: cancelled ? "#dc2626" : "#009688",
              width: `${progressPct}%`,
              transition: "width 0.5s ease",
            }}
          />
        </div>

        {ORDER_STEPS.map((step) => {
          const stepUiStatus = getStepStatus(step.key);
          const time = getStepTime(step.key);
          const timeStr = time
            ? time.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })
            : null;

          return (
            <div
              key={step.key}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                position: "relative",
                zIndex: 1,
                cursor: onStatusChange && stepUiStatus !== "current" ? "pointer" : "default",
              }}
              role={onStatusChange ? "button" : undefined}
              tabIndex={onStatusChange && stepUiStatus !== "current" ? 0 : undefined}
              onClick={() => {
                if (!onStatusChange || stepUiStatus === "current" || cancelled) return;
                const next = mapStepToOrderStatus(step.key);
                if (next === currentStatus) return;
                onStatusChange(next);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (!onStatusChange || stepUiStatus === "current" || cancelled) return;
                  onStatusChange(mapStepToOrderStatus(step.key));
                }
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: stepUiStatus === "completed" || stepUiStatus === "current" ? "#009688" : "#F3F4F6",
                  border: "3px solid",
                  borderColor: stepUiStatus === "upcoming" ? "#E5E7EB" : "#009688",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: stepUiStatus === "completed" ? 16 : 18,
                  marginBottom: 8,
                  transition: "all 0.3s",
                  boxShadow: stepUiStatus === "current" ? "0 0 0 4px rgba(0,150,136,0.2)" : "none",
                }}
              >
                {stepUiStatus === "completed" ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" aria-hidden>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span style={{ filter: stepUiStatus === "upcoming" ? "grayscale(1)" : "none" }} aria-hidden>
                    {step.icon}
                  </span>
                )}
              </div>

              <p
                style={{
                  fontSize: 11,
                  fontWeight: stepUiStatus === "current" ? 700 : 500,
                  color: stepUiStatus === "upcoming" ? "#9CA3AF" : "#111827",
                  margin: "0 0 4px",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                }}
                className="dark:text-slate-200"
              >
                {step.label}
              </p>

              {timeStr ? (
                <p style={{ fontSize: 10, color: "#6B7280", margin: 0, textAlign: "center" }}>{timeStr}</p>
              ) : null}

              {stepUiStatus === "current" ? (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    background: "#009688",
                    color: "#fff",
                    padding: "2px 6px",
                    borderRadius: 99,
                    marginTop: 4,
                    letterSpacing: "0.04em",
                  }}
                >
                  CURRENT
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      {cancelled ? (
        <p className="mb-4 text-center text-sm font-semibold text-red-600">Order {currentStatus}</p>
      ) : null}

      {timeline.length > 0 ? (
        <div style={{ marginBottom: 20 }}>
          <h4
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#374151",
              margin: "0 0 12px",
              paddingBottom: 8,
              borderBottom: "1px solid #F3F4F6",
            }}
            className="dark:border-slate-700 dark:text-slate-200"
          >
            📋 Order History
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[...timeline].reverse().map((entry, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  padding: "8px 12px",
                  background: "#F9FAFB",
                  borderRadius: 8,
                  borderLeft: "3px solid #009688",
                }}
                className="dark:bg-slate-800"
              >
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: "0 0 2px" }} className="dark:text-white">
                    {entry.title}
                  </p>
                  {entry.description ? (
                    <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 2px" }} className="dark:text-slate-400">
                      {entry.description}
                    </p>
                  ) : null}
                  <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>
                    {entry.timestamp
                      ? new Date(entry.timestamp).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                    {entry.by ? ` · by ${entry.by}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {emailHistory.length > 0 ? (
        <div>
          <h4
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#374151",
              margin: "0 0 12px",
              paddingBottom: 8,
              borderBottom: "1px solid #F3F4F6",
            }}
            className="dark:border-slate-700 dark:text-slate-200"
          >
            📧 Email History
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[...emailHistory].reverse().map((email, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  background: "#F9FAFB",
                  borderRadius: 8,
                  borderLeft: "3px solid #C9A84C",
                }}
                className="dark:bg-slate-800"
              >
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#111827", margin: "0 0 2px" }} className="dark:text-white">
                    {email.subject || email.type}
                  </p>
                  <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }} className="dark:text-slate-400">
                    To: {email.to} ·{" "}
                    {email.sentAt
                      ? new Date(email.sentAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </p>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 99,
                    background: email.status === "sent" ? "#d1fae5" : "#fee2e2",
                    color: email.status === "sent" ? "#065f46" : "#991b1b",
                  }}
                >
                  {email.status === "sent" ? "✓ Sent" : "✗ Failed"}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
