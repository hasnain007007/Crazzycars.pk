/**
 * Unified chronological activity feed for an order (OR4).
 * Merges status history, notes, payment confirmation, timeline, email history.
 */
"use client";

function when(d) {
  if (!d) return null;
  const t = new Date(d).getTime();
  return Number.isFinite(t) ? t : null;
}

function formatWhen(d) {
  const t = when(d);
  if (t == null) return "—";
  try {
    return new Date(t).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "—";
  }
}

/**
 * @param {object} order
 * @returns {{ id: string, at: number, kind: string, title: string, body?: string, by?: string }[]}
 */
export function buildOrderActivityEvents(order) {
  const events = [];
  if (!order) return events;

  if (order.createdAt) {
    events.push({
      id: "placed",
      at: when(order.createdAt),
      kind: "placed",
      title: "Order placed",
      body: order.orderNumber ? `#${order.orderNumber}` : "",
      by: "system",
    });
  }

  for (const h of order.statusHistory || []) {
    events.push({
      id: `status-${h.id || h.changedAt}-${h.status}`,
      at: when(h.changedAt),
      kind: "status",
      title: `Status → ${h.status}`,
      body: h.note || "",
      by: h.changedBy || "System",
    });
  }

  const pc = order.paymentConfirmation;
  if (pc?.confirmedAt || pc?.reference) {
    events.push({
      id: "payment-confirm",
      at: when(pc.confirmedAt) || when(order.updatedAt) || Date.now(),
      kind: "payment",
      title: "Payment confirmed",
      body: [pc.reference ? `Ref: ${pc.reference}` : null, pc.confirmedBy ? `by ${pc.confirmedBy}` : null]
        .filter(Boolean)
        .join(" · "),
      by: pc.confirmedBy || "Admin",
    });
  }

  for (const n of order.internalNotes || []) {
    events.push({
      id: `note-${n.id || n.addedAt}`,
      at: when(n.addedAt),
      kind: "note",
      title: "Internal note",
      body: n.note || "",
      by: n.addedBy || "Admin",
    });
  }

  const statusAt = new Set(
    (order.statusHistory || [])
      .map((h) => when(h.changedAt))
      .filter((t) => t != null)
      .map((t) => Math.floor(t / 1000))
  );
  for (const t of order.timeline || []) {
    const at = when(t.timestamp);
    // Skip progress-timeline echoes of statusHistory (same second)
    if (
      at != null &&
      statusAt.has(Math.floor(at / 1000)) &&
      t.status &&
      !["address_updated", "items_updated"].includes(String(t.status))
    ) {
      continue;
    }
    events.push({
      id: `tl-${t.timestamp}-${t.title}`,
      at,
      kind: "timeline",
      title: t.title || t.status || "Update",
      body: t.description || "",
      by: t.by || "system",
    });
  }

  for (const em of order.emailHistory || []) {
    events.push({
      id: `email-${em.sentAt}-${em.type}`,
      at: when(em.sentAt),
      kind: "email",
      title: `Email ${em.status === "failed" ? "failed" : "sent"}`,
      body: [em.subject, em.to ? `→ ${em.to}` : null].filter(Boolean).join(" · "),
      by: "system",
    });
  }

  if (order.whatsappNotified) {
    events.push({
      id: "wa-flag",
      at: when(order.updatedAt) || when(order.createdAt),
      kind: "whatsapp",
      title: "WhatsApp notification flagged",
      body: "",
      by: "system",
    });
  }

  return events
    .filter((e) => e.at != null)
    .sort((a, b) => b.at - a.at);
}

const KIND_COLOR = {
  placed: "var(--accent-line)",
  status: "var(--accent-money)",
  payment: "var(--accent-line)",
  note: "var(--accent-attention)",
  timeline: "var(--text-muted)",
  email: "var(--text-muted)",
  whatsapp: "var(--accent-line)",
};

export function OrderActivityFeed({ order }) {
  const events = buildOrderActivityEvents(order);

  return (
    <div
      className="rounded-xl border p-4 shadow-none"
      style={{ background: "var(--bg-panel)", borderColor: "var(--border-hairline)" }}
    >
      <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        Activity
      </h2>
      <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
        Status changes, payment confirmations, notes, and system events — newest first.
      </p>

      {events.length === 0 ? (
        <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
          No activity recorded yet.
        </p>
      ) : (
        <ul className="relative mt-4 space-y-0 pl-1">
          <span
            className="absolute bottom-2 left-[7px] top-2 w-px"
            style={{ background: "var(--border-hairline)" }}
            aria-hidden
          />
          {events.map((e) => (
            <li key={e.id} className="relative flex gap-3 pb-5 last:pb-0">
              <span
                className="relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4"
                style={{
                  background: KIND_COLOR[e.kind] || "var(--text-muted)",
                  ringColor: "var(--bg-panel)",
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {e.title}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {e.by ? `${e.by} · ` : ""}
                  {formatWhen(e.at)}
                </p>
                {e.body ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm" style={{ color: "var(--text-primary)" }}>
                    {e.body}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
