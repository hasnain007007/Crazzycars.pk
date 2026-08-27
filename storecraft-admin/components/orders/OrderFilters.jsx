/**
 * Filter controls for the orders list page.
 */
"use client";

const inputStyle = {
  background: "var(--bg-base)",
  borderColor: "var(--border-hairline)",
  color: "var(--text-primary)",
};

export function OrderFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  paymentStatus,
  onPaymentStatusChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  tag = "",
  onTagChange,
  customerConfirm = "all",
  onCustomerConfirmChange,
}) {
  return (
    <div
      className="flex flex-col gap-3 rounded-xl border p-4 shadow-none"
      style={{ background: "var(--bg-panel)", borderColor: "var(--border-hairline)" }}
    >
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-6">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="mt-0.5 w-full rounded-lg border px-2 py-2 text-sm outline-none"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              className="mt-0.5 w-full rounded-lg border px-2 py-2 text-sm outline-none"
              style={inputStyle}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            Order status
          </label>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="mt-0.5 w-full rounded-lg border px-2 py-2 text-sm outline-none"
            style={inputStyle}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="packed">Packed</option>
            <option value="shipped">Dispatched</option>
            <option value="delivered">Delivered</option>
            <option value="returned">Returned</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
            <option value="disputed">Disputed</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            Payment status
          </label>
          <select
            value={paymentStatus}
            onChange={(e) => onPaymentStatusChange(e.target.value)}
            className="mt-0.5 w-full rounded-lg border px-2 py-2 text-sm outline-none"
            style={inputStyle}
          >
            <option value="all">All</option>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            Customer confirm
          </label>
          <select
            value={customerConfirm}
            onChange={(e) => onCustomerConfirmChange?.(e.target.value)}
            className="mt-0.5 w-full rounded-lg border px-2 py-2 text-sm outline-none"
            style={inputStyle}
          >
            <option value="all">All</option>
            <option value="yes">Customer said yes</option>
            <option value="waiting">Waiting for customer</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            Tag
          </label>
          <input
            type="text"
            placeholder="e.g. priority"
            value={tag}
            onChange={(e) => onTagChange?.(e.target.value)}
            className="mt-0.5 w-full rounded-lg border px-2 py-2 text-sm outline-none"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            Search
          </label>
          <input
            type="search"
            placeholder="Order #, name, phone, or email"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="mt-0.5 w-full rounded-lg border px-2 py-2 text-sm outline-none"
            style={inputStyle}
          />
        </div>
      </div>
    </div>
  );
}
