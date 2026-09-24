/**
 * Filter controls for the orders list page — Shopify Polaris density.
 */
"use client";

import { ORIGIN_FILTER_OPTIONS } from "@/lib/orderOrigin";

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
  origin = "all",
  onOriginChange,
}) {
  return (
    <div className="op-filters">
      <div className="op-field" style={{ width: 132 }}>
        <span className="op-field-label">From</span>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="op-input"
        />
      </div>
      <div className="op-field" style={{ width: 132 }}>
        <span className="op-field-label">To</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="op-input"
        />
      </div>
      <div className="op-field" style={{ width: 140 }}>
        <span className="op-field-label">Order status</span>
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="op-select"
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
      <div className="op-field" style={{ width: 140 }}>
        <span className="op-field-label">Payment status</span>
        <select
          value={paymentStatus}
          onChange={(e) => onPaymentStatusChange(e.target.value)}
          className="op-select"
        >
          <option value="all">All</option>
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>
      <div className="op-field" style={{ width: 150 }}>
        <span className="op-field-label">Customer confirm</span>
        <select
          value={customerConfirm}
          onChange={(e) => onCustomerConfirmChange?.(e.target.value)}
          className="op-select"
        >
          <option value="all">All</option>
          <option value="yes">Customer said yes</option>
          <option value="waiting">Waiting for customer</option>
        </select>
      </div>
      <div className="op-field" style={{ width: 160 }}>
        <span className="op-field-label">Origin</span>
        <select
          value={origin}
          onChange={(e) => onOriginChange?.(e.target.value)}
          className="op-select"
          title="Where the shopper came from"
        >
          {ORIGIN_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className="op-field" style={{ width: 120 }}>
        <span className="op-field-label">Tag</span>
        <input
          type="text"
          placeholder="e.g. priority"
          value={tag}
          onChange={(e) => onTagChange?.(e.target.value)}
          className="op-input"
        />
      </div>
      <div className="op-field op-search">
        <span className="op-field-label">Search and filter</span>
        <input
          type="search"
          placeholder="Tracking ID (GW…), order #, phone, name…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          className="op-input"
        />
      </div>
    </div>
  );
}
