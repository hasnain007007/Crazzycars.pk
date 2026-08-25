"use client";

import { formatAdminPrice } from "@/lib/currency";

function formatWhen(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "—";
  }
}

function formatOptions(item) {
  if (Array.isArray(item?.selectedOptions) && item.selectedOptions.length) {
    return item.selectedOptions
      .map((o) => {
        if (typeof o === "string") return o;
        const name = o?.name || o?.variationName || "";
        const value = o?.value || o?.optionValue || "";
        return name && value ? `${name}: ${value}` : value || name;
      })
      .filter(Boolean)
      .join(" · ");
  }
  if (item?.variationLabel) return item.variationLabel;
  const mc = item?.matchedCombination;
  if (mc && Array.isArray(mc.options) && mc.options.length) {
    return mc.options
      .map((o) => `${o?.name || ""}: ${o?.value || ""}`.replace(/^:\s*|:\s*$/g, "").trim())
      .filter(Boolean)
      .join(" · ");
  }
  return "";
}

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 border-b border-slate-100 py-2 text-sm last:border-0 dark:border-slate-800">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="break-all text-slate-800 dark:text-slate-100">{children}</dd>
    </div>
  );
}

export function AbandonedCartDetailModal({ cart, onClose, onWhatsApp, onEmail, onDismiss, onReopen }) {
  if (!cart) return null;

  const items = Array.isArray(cart.items) ? cart.items : [];
  const reminders = Array.isArray(cart.reminders) ? cart.reminders : [];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="abandoned-cart-detail-title"
        className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl dark:bg-slate-900"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div>
            <h2
              id="abandoned-cart-detail-title"
              className="text-lg font-bold text-slate-900 dark:text-white"
            >
              Cart details
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {cart.customer?.name || "Guest"} ·{" "}
              <span className="capitalize">{cart.status}</span>
              {cart.convertedOrderNumber ? ` · Order ${cart.convertedOrderNumber}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
          >
            Close
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              Customer
            </h3>
            <dl className="rounded-xl border border-slate-200 px-3 dark:border-slate-700">
              <Row label="Name">{cart.customer?.name || "Guest"}</Row>
              <Row label="Phone">{cart.customer?.phone || "—"}</Row>
              <Row label="Email">{cart.customer?.email || "—"}</Row>
            </dl>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              Session timeline
            </h3>
            <dl className="rounded-xl border border-slate-200 px-3 dark:border-slate-700">
              <Row label="Status">
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold capitalize dark:bg-slate-800">
                  {cart.status}
                </span>
              </Row>
              <Row label="Created">{formatWhen(cart.createdAt)}</Row>
              <Row label="Last activity">{formatWhen(cart.lastActivityAt)}</Row>
              <Row label="Abandoned">{formatWhen(cart.abandonedAt)}</Row>
              <Row label="Recovered">{formatWhen(cart.recoveredAt)}</Row>
              <Row label="Last path">
                <span className="font-mono text-xs">{cart.lastPath || "—"}</span>
              </Row>
              <Row label="Session ID">
                <span className="font-mono text-xs">{cart.sessionId || "—"}</span>
              </Row>
              <Row label="Recovery token">
                <span className="font-mono text-xs">{cart.recoveryToken || "—"}</span>
              </Row>
              <Row label="Recover URL">
                {cart.recoverUrl ? (
                  <a
                    href={cart.recoverUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#1d6fb8] underline"
                  >
                    {cart.recoverUrl}
                  </a>
                ) : (
                  "—"
                )}
              </Row>
              <Row label="Device / UA">
                <span className="text-xs leading-snug">{cart.userAgent || "—"}</span>
              </Row>
              {cart.convertedOrderNumber ? (
                <Row label="Converted order">
                  <a
                    href={`/orders?q=${encodeURIComponent(cart.convertedOrderNumber)}`}
                    className="font-semibold text-emerald-700 underline dark:text-emerald-400"
                  >
                    {cart.convertedOrderNumber}
                  </a>
                </Row>
              ) : null}
            </dl>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Cart items ({cart.itemCount || items.length})
              </h3>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {formatAdminPrice(cart.subtotal || 0)}
              </p>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-800/80">
                  <tr>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">Options</th>
                    <th className="px-3 py-2">SKU</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Unit</th>
                    <th className="px-3 py-2 text-right">Line</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                        No items in this cart
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => {
                      const unit = Number(item.unitPrice ?? item.price) || 0;
                      const qty = Math.max(1, Number(item.quantity) || 1);
                      const opts = formatOptions(item);
                      return (
                        <tr key={`${item.productId}-${item.variantId}-${idx}`}>
                          <td className="px-3 py-2">
                            <div className="flex items-start gap-2">
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt=""
                                  className="h-10 w-10 shrink-0 rounded-md object-cover"
                                />
                              ) : (
                                <div className="h-10 w-10 shrink-0 rounded-md bg-slate-100 dark:bg-slate-800" />
                              )}
                              <div>
                                <div className="font-medium text-slate-900 dark:text-white">
                                  {item.name || "Product"}
                                </div>
                                {item.slug ? (
                                  <div className="font-mono text-[10px] text-slate-400">{item.slug}</div>
                                ) : null}
                                {item.articleNo ? (
                                  <div className="text-[10px] text-slate-400">
                                    Article: {item.articleNo}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                            {opts || "—"}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-500">
                            {item.sku || "—"}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{qty}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {formatAdminPrice(unit)}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold tabular-nums">
                            {formatAdminPrice(unit * qty)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              Reminder log ({reminders.length}) · Emails sent: {cart.emailReminderCount || 0}
            </h3>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700">
              {reminders.length === 0 ? (
                <p className="px-3 py-4 text-sm text-slate-500">No reminders sent yet</p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {reminders.map((r, idx) => (
                    <li key={`${r.channel}-${r.sentAt}-${idx}`} className="px-3 py-2.5 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold uppercase dark:bg-slate-800">
                          {r.channel || "email"}
                        </span>
                        <span className="text-xs capitalize text-slate-500">{r.status || "sent"}</span>
                        <span className="text-xs text-slate-400">{formatWhen(r.sentAt)}</span>
                      </div>
                      {r.note ? (
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{r.note}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              {cart.lastEmailReminderAt ? (
                <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500 dark:border-slate-800">
                  Last email: {formatWhen(cart.lastEmailReminderAt)}
                </p>
              ) : null}
            </div>
          </section>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-700 dark:bg-slate-800/50">
          {cart.customer?.phone ? (
            <button
              type="button"
              onClick={() => onWhatsApp?.(cart)}
              className="rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white"
            >
              WhatsApp
            </button>
          ) : null}
          {cart.customer?.email ? (
            <button
              type="button"
              onClick={() => onEmail?.(cart.id)}
              className="rounded-lg bg-[#1d6fb8] px-3 py-1.5 text-xs font-semibold text-white"
            >
              Send email
            </button>
          ) : null}
          {cart.recoverUrl ? (
            <a
              href={cart.recoverUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            >
              Open recover link
            </a>
          ) : null}
          {cart.status !== "dismissed" ? (
            <button
              type="button"
              onClick={() => onDismiss?.(cart.id)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-600 dark:bg-slate-900"
            >
              Dismiss
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onReopen?.(cart.id)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-600 dark:bg-slate-900"
            >
              Reopen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
