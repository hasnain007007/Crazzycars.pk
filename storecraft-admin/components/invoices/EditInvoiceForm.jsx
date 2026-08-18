/**
 * Edit existing invoice — add/remove products, adjust qty & rates.
 */
"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { formatAdminPrice } from "@/lib/currency";
import { getInvoiceStoreMeta } from "@/lib/invoiceStoreMeta";
import { downloadInvoicePdf, printInvoice } from "@/lib/downloadInvoicePdf";
import { InvoicePreviewFrame } from "@/components/invoices/InvoicePreviewFrame";
import { useInvoiceProductCatalog } from "@/components/invoices/useInvoiceProductCatalog";

function lineTotal(qty, unitPrice) {
  return Math.round(Math.max(0, Number(qty) || 0) * Math.max(0, Number(unitPrice) || 0) * 100) / 100;
}

function productUnitPrice(product) {
  const sale = Number(product?.pricing?.salePrice);
  const regular = Number(product?.pricing?.regularPrice);
  if (Number.isFinite(sale) && sale > 0) return sale;
  if (Number.isFinite(regular) && regular >= 0) return regular;
  return 0;
}

function productImage(product) {
  const imgs = product?.media?.images;
  if (Array.isArray(imgs) && imgs.length) {
    const first = imgs[0];
    return typeof first === "string" ? first : first?.url || first?.secure_url || "";
  }
  return "";
}

function productIdOf(product) {
  return String(product?._id || product?.id || "");
}

const PAYMENT_METHOD_OPTIONS = [
  { value: "cod", label: "Cash / COD" },
  { value: "jazzcash", label: "JazzCash" },
  { value: "easypaisa", label: "Easypaisa" },
  { value: "bankTransfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
];

export function EditInvoiceForm() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    city: "",
    address: "",
    customerId: null,
  });
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [amountPaid, setAmountPaid] = useState(0);
  const [remainingBalance, setRemainingBalance] = useState(0);
  const [payments, setPayments] = useState([]);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payNote, setPayNote] = useState("");
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [deliveryOn, setDeliveryOn] = useState(false);
  const [shippingCost, setShippingCost] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState([]);
  const [manualName, setManualName] = useState("");
  const [manualQty, setManualQty] = useState("1");
  const [manualPrice, setManualPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [linkedOrderId, setLinkedOrderId] = useState(null);
  const [linkedOrderNumber, setLinkedOrderNumber] = useState("");
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [storeMeta, setStoreMeta] = useState(null);
  const {
    catalog,
    catalogLoading,
    searching,
    catalogFilter,
    setCatalogFilter,
  } = useInvoiceProductCatalog();

  useEffect(() => {
    getInvoiceStoreMeta().then(setStoreMeta).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/invoices/${id}`, { credentials: "include" });
        const json = await res.json();
        if (!res.ok || !json.success || !json.invoice) {
          toast.error(json.error || "Invoice not found.");
          router.push("/invoices");
          return;
        }
        if (cancelled) return;
        const inv = json.invoice;
        setInvoiceNumber(inv.invoiceNumber || "");
        setLinkedOrderId(inv.linkedOrderId || null);
        setLinkedOrderNumber(inv.linkedOrderNumber || "");
        setCustomer({
          name: inv.customer?.name || "",
          phone: inv.customer?.phone || "",
          email: inv.customer?.email || "",
          city: inv.billingAddress?.city || "",
          address: inv.billingAddress?.street || "",
          customerId: inv.customerId || null,
        });
        setPaymentMethod(inv.paymentMethod === "bankTransfer" ? "bankTransfer" : inv.paymentMethod || "cod");
        setPaymentStatus(inv.paymentStatus || "unpaid");
        setAmountPaid(Number(inv.amountPaid) || 0);
        setRemainingBalance(
          inv.remainingBalance != null
            ? Number(inv.remainingBalance)
            : Math.max(0, (Number(inv.pricing?.total) || 0) - (Number(inv.amountPaid) || 0))
        );
        setPayments(Array.isArray(inv.payments) ? inv.payments : []);
        setPayMethod(inv.paymentMethod === "cod" ? "cash" : inv.paymentMethod || "cash");
        const ship = Number(inv.pricing?.shippingCost) || 0;
        setDeliveryOn(ship > 0);
        setShippingCost(String(ship || 250));
        setDiscount(String(Number(inv.pricing?.discount) || 0));
        setNote(inv.note || "");
        setLines(
          (inv.items || []).map((item, idx) => ({
            key: `line-${idx}-${item.productId || item.name}`,
            productId: item.productId || null,
            name: item.name || "",
            image: item.image || "",
            variation: item.variation || "",
            quantity: Math.max(1, Number(item.quantity) || 1),
            unitPrice: Math.max(0, Number(item.unitPrice) || 0),
          }))
        );
      } catch {
        toast.error("Could not load invoice.");
        router.push("/invoices");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + lineTotal(line.quantity, line.unitPrice), 0),
    [lines]
  );
  const discountNum = Math.max(0, Number(discount) || 0);
  const shipNum = deliveryOn ? Math.max(0, Number(shippingCost) || 0) : 0;
  const total = Math.max(0, Math.round((subtotal - discountNum + shipNum) * 100) / 100);

  const addProduct = useCallback((product) => {
    const pid = productIdOf(product);
    setLines((prev) => {
      const existing = prev.findIndex((l) => l.productId === pid && pid);
      if (existing >= 0) {
        return prev.map((l, i) =>
          i === existing ? { ...l, quantity: Math.min(999, l.quantity + 1) } : l
        );
      }
      return [
        ...prev,
        {
          key: `new-${pid}-${Date.now()}`,
          productId: pid || null,
          name: product.name || "Product",
          image: productImage(product),
          variation: "",
          quantity: 1,
          unitPrice: productUnitPrice(product),
        },
      ];
    });
    toast.success(`Added ${product.name || "product"}`);
  }, []);

  const addManualItem = useCallback(() => {
    const name = manualName.trim();
    if (!name) {
      toast.error("Enter an item name.");
      return;
    }
    setLines((prev) => [
      ...prev,
      {
        key: `manual-${Date.now()}`,
        productId: null,
        name,
        image: "",
        variation: "Manual",
        quantity: Math.max(1, Math.round(Number(manualQty) || 1)),
        unitPrice: Math.max(0, Number(manualPrice) || 0),
      },
    ]);
    setManualName("");
    setManualQty("1");
    setManualPrice("");
    toast.success("Manual item added");
  }, [manualName, manualQty, manualPrice]);

  const updateLine = useCallback((index, patch) => {
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        const next = { ...line, ...patch };
        if (patch.quantity != null) next.quantity = Math.max(1, Math.min(999, Number(patch.quantity) || 1));
        if (patch.unitPrice != null) next.unitPrice = Math.max(0, Number(patch.unitPrice) || 0);
        return next;
      })
    );
  }, []);

  const removeLine = useCallback((index) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const previewDraft = useMemo(
    () => ({
      invoiceNumber: invoiceNumber || "—",
      createdAt: new Date().toISOString(),
      customer: {
        name: customer.name.trim() || "Customer",
        phone: customer.phone.trim(),
        email: customer.email.trim(),
      },
      shippingAddress: {
        street: customer.address.trim(),
        city: customer.city.trim(),
        country: "Pakistan",
      },
      billingAddress: {
        street: customer.address.trim(),
        city: customer.city.trim(),
        country: "Pakistan",
      },
      items: lines.map((line) => ({
        name: line.name,
        variation: line.variation || "",
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        total: lineTotal(line.quantity, line.unitPrice),
      })),
      pricing: { subtotal, discount: discountNum, shippingCost: shipNum, total },
      paymentMethod: paymentMethod === "card" ? "bankTransfer" : paymentMethod,
      paymentStatus,
      note: note.trim(),
      currency: storeMeta?.currency || "PKR",
    }),
    [
      invoiceNumber,
      customer,
      lines,
      subtotal,
      discountNum,
      shipNum,
      total,
      paymentMethod,
      paymentStatus,
      note,
      storeMeta?.currency,
    ]
  );

  async function submit(e) {
    e.preventDefault();
    if (!lines.length) {
      toast.error("Add at least one item.");
      return;
    }
    if (!customer.name.trim() || !customer.phone.trim()) {
      toast.error("Customer name and phone are required.");
      return;
    }
    setSaving(true);
    try {
      const method = paymentMethod === "card" ? "bankTransfer" : paymentMethod;
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            name: customer.name.trim(),
            phone: customer.phone.trim(),
            email: customer.email.trim(),
            city: customer.city.trim(),
            address: customer.address.trim(),
            customerId: customer.customerId,
          },
          billingAddress: {
            street: customer.address.trim(),
            city: customer.city.trim(),
            country: "Pakistan",
          },
          items: lines.map((line) => ({
            productId: line.productId,
            name: line.name,
            image: line.image,
            variation: line.variation,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            unitCost: line.unitCost,
          })),
          discount: discountNum,
          shippingCost: shipNum,
          paymentMethod: method,
          paymentStatus,
          note: note.trim(),
          saveCustomer: true,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Save failed");
      const inv = json.invoice;
      setPaymentStatus(inv.paymentStatus || paymentStatus);
      setAmountPaid(Number(inv.amountPaid) || 0);
      setRemainingBalance(Number(inv.remainingBalance) || 0);
      setPayments(Array.isArray(inv.payments) ? inv.payments : payments);
      toast.success("Invoice updated.");
    } catch (err) {
      toast.error(err.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function recordInstallment(e) {
    e.preventDefault();
    const amount = Math.round((Number(payAmount) || 0) * 100) / 100;
    if (!(amount > 0)) {
      toast.error("Enter a payment amount.");
      return;
    }
    if (amount > remainingBalance + 0.009) {
      toast.error(`Amount cannot exceed remaining ${formatAdminPrice(remainingBalance)}.`);
      return;
    }
    setRecordingPayment(true);
    try {
      const res = await fetch(`/api/invoices/${id}/payments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          method: payMethod,
          note: payNote.trim(),
          paidAt: payDate ? new Date(`${payDate}T12:00:00`).toISOString() : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Could not record payment.");
      const inv = json.invoice;
      setAmountPaid(Number(inv.amountPaid) || 0);
      setRemainingBalance(Number(inv.remainingBalance) || 0);
      setPaymentStatus(inv.paymentStatus || "partial");
      setPayments(Array.isArray(inv.payments) ? inv.payments : []);
      setPayAmount("");
      setPayNote("");
      toast.success(`Recorded ${formatAdminPrice(amount)}. Remaining ${formatAdminPrice(inv.remainingBalance)}.`);
    } catch (err) {
      toast.error(err.message || "Payment failed.");
    } finally {
      setRecordingPayment(false);
    }
  }

  async function removeInstallment(paymentId) {
    if (!paymentId || !confirm("Remove this payment entry?")) return;
    try {
      const res = await fetch(`/api/invoices/${id}/payments`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Could not remove payment.");
      const inv = json.invoice;
      setAmountPaid(Number(inv.amountPaid) || 0);
      setRemainingBalance(Number(inv.remainingBalance) || 0);
      setPaymentStatus(inv.paymentStatus || "unpaid");
      setPayments(Array.isArray(inv.payments) ? inv.payments : []);
      toast.success("Payment removed.");
    } catch (err) {
      toast.error(err.message || "Could not remove.");
    }
  }

  if (loading) {
    return <div className="h-64 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />;
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Edit invoice</h1>
          <p className="mt-1 font-mono text-sm text-slate-500">{invoiceNumber}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              try {
                printInvoice(previewDraft, storeMeta || {});
                toast.success("Print dialog opened.");
              } catch {
                toast.error("Could not print.");
              }
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold dark:border-slate-600"
          >
            Print
          </button>
          <button
            type="button"
            onClick={async () => {
              const toastId = toast.loading("Preparing PDF…");
              try {
                await downloadInvoicePdf(previewDraft, storeMeta || {});
                toast.success("PDF downloaded.", { id: toastId });
              } catch {
                toast.error("Could not download PDF.", { id: toastId });
              }
            }}
            className="rounded-lg bg-[#1A7A4C] px-3 py-2 text-sm font-bold text-white hover:bg-[#15663f]"
          >
            Download PDF
          </button>
          {linkedOrderId ? (
            <Link
              href={`/orders/${linkedOrderId}`}
              className="rounded-lg border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 dark:border-emerald-800 dark:text-emerald-400"
            >
              View order{linkedOrderNumber ? ` (${linkedOrderNumber})` : ""}
            </Link>
          ) : (
            <button
              type="button"
              disabled={creatingOrder}
              onClick={async () => {
                if (
                  !confirm(
                    `Add invoice ${invoiceNumber} to Orders?\n\nCreates a linked order for packing / Postex. Stock was already deducted when the invoice was saved.`
                  )
                ) {
                  return;
                }
                setCreatingOrder(true);
                const toastId = toast.loading("Creating order…");
                try {
                  const res = await fetch(`/api/invoices/${id}/create-order`, {
                    method: "POST",
                    credentials: "include",
                  });
                  const json = await res.json();
                  if (!res.ok || !json.success) throw new Error(json.error || "Could not create order.");
                  const oid = json.order?.id;
                  const onum = json.order?.orderNumber || "";
                  setLinkedOrderId(oid || null);
                  setLinkedOrderNumber(onum);
                  toast.success(
                    json.alreadyLinked
                      ? `Already linked to ${onum || "order"}.`
                      : `Order ${onum} created.`,
                    { id: toastId }
                  );
                  if (oid) router.push(`/orders/${oid}`);
                } catch (err) {
                  toast.error(err.message || "Could not create order.", { id: toastId });
                } finally {
                  setCreatingOrder(false);
                }
              }}
              className="rounded-lg bg-[#1d6fb8] px-3 py-2 text-sm font-bold text-white hover:bg-[#185fa0] disabled:opacity-50"
            >
              {creatingOrder ? "Adding…" : "Add to orders"}
            </button>
          )}
          <Link
            href="/invoices"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold dark:border-slate-600"
          >
            Back
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="order-1 lg:col-span-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:sticky lg:top-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Add products</h2>
            <input
              type="search"
              value={catalogFilter}
              onChange={(e) => setCatalogFilter(e.target.value)}
              placeholder="Search all products (e.g. corolla)…"
              autoComplete="off"
              className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950"
            />
            <div className="mt-3 max-h-[min(20rem,45vh)] space-y-1 overflow-y-auto overscroll-contain sm:max-h-80">
              {catalogLoading && !catalog.length ? (
                <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
              ) : !catalog.length ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  {catalogFilter.trim()
                    ? `No products match “${catalogFilter.trim()}”.`
                    : "No products found."}
                </p>
              ) : (
                catalog.map((p) => (
                  <button
                    key={productIdOf(p)}
                    type="button"
                    onClick={() => addProduct(p)}
                    className="flex w-full items-center justify-between gap-2 rounded-xl px-2 py-2 text-left text-sm hover:bg-emerald-50 active:bg-emerald-100 dark:hover:bg-emerald-950/30"
                  >
                    <span className="truncate font-medium">{p.name}</span>
                    <span className="shrink-0 text-xs text-slate-400">
                      {formatAdminPrice(productUnitPrice(p))} · +
                    </span>
                  </button>
                ))
              )}
            </div>
            {searching ? (
              <p className="mt-2 text-center text-[11px] text-slate-400">Updating results…</p>
            ) : null}
            <div className="mt-3 rounded-xl border border-dashed border-slate-200 p-3 dark:border-slate-600">
              <p className="text-xs font-semibold uppercase text-slate-500">Manual item</p>
              <div className="mt-2 flex flex-col gap-2">
                <input
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Name"
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-950"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={manualQty}
                    onChange={(e) => setManualQty(e.target.value)}
                    className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-950"
                  />
                  <input
                    type="number"
                    value={manualPrice}
                    onChange={(e) => setManualPrice(e.target.value)}
                    placeholder="Price"
                    className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-950"
                  />
                  <button
                    type="button"
                    onClick={addManualItem}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="order-2 space-y-4 lg:col-span-7">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-sm font-semibold">Customer</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs sm:col-span-2">
                Name *
                <input
                  required
                  value={customer.name}
                  onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                />
              </label>
              <label className="text-xs">
                Phone *
                <input
                  required
                  value={customer.phone}
                  onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                />
              </label>
              <label className="text-xs">
                Email
                <input
                  value={customer.email}
                  onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-sm font-semibold">Line items</h2>
            {!lines.length ? (
              <p className="mt-6 text-center text-sm text-slate-400">No items — add from catalog.</p>
            ) : (
              <table className="mt-3 min-w-full text-sm">
                <thead>
                  <tr className="border-b text-[10px] uppercase text-slate-400">
                    <th className="py-2 text-left">Product</th>
                    <th className="py-2 px-2">Qty</th>
                    <th className="py-2 px-2">Rate</th>
                    <th className="py-2 px-2">Total</th>
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lines.map((line, idx) => (
                    <tr key={line.key}>
                      <td className="py-2 pr-2">
                        <input
                          value={line.name}
                          onChange={(e) => updateLine(idx, { name: e.target.value })}
                          className="w-full rounded border border-slate-200 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-950"
                        />
                      </td>
                      <td className="px-2">
                        <input
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                          className="w-16 rounded border border-slate-200 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-950"
                        />
                      </td>
                      <td className="px-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.unitPrice}
                          onChange={(e) => updateLine(idx, { unitPrice: e.target.value })}
                          className="w-24 rounded border border-slate-200 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-950"
                        />
                      </td>
                      <td className="px-2 font-semibold tabular-nums">
                        {formatAdminPrice(lineTotal(line.quantity, line.unitPrice))}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          className="text-xs font-semibold text-red-600"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs">
                Payment method
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                >
                  {PAYMENT_METHOD_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs">
                Payment status
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                >
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partial</option>
                </select>
              </label>
              <label className="col-span-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={deliveryOn}
                  onChange={(e) => setDeliveryOn(e.target.checked)}
                />
                Delivery charge
              </label>
              {deliveryOn ? (
                <label className="text-xs">
                  Shipping
                  <input
                    type="number"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                  />
                </label>
              ) : null}
              <label className="text-xs">
                Discount
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                />
              </label>
            </div>
            <div className="mt-4 space-y-1 border-t border-slate-100 pt-4 dark:border-slate-800">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total</span>
                <span className="font-semibold tabular-nums">{formatAdminPrice(total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Paid</span>
                <span className="font-semibold tabular-nums text-emerald-700">{formatAdminPrice(amountPaid)}</span>
              </div>
              <div className="flex justify-between text-base font-bold">
                <span>Remaining</span>
                <span className={remainingBalance > 0 ? "text-amber-600" : "text-[#1A7A4C]"}>
                  {formatAdminPrice(remainingBalance)}
                </span>
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-4 w-full rounded-xl bg-[#1A7A4C] py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Installment payments</h2>
            <p className="mt-1 text-xs text-slate-500">
              Record what the shopkeeper paid. Remaining updates automatically.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs">
                Amount received
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder={remainingBalance > 0 ? String(remainingBalance) : "0"}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                />
              </label>
              <label className="text-xs">
                Date
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                />
              </label>
              <label className="text-xs">
                Method
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                >
                  <option value="cash">Cash</option>
                  <option value="bankTransfer">Bank Transfer</option>
                  <option value="jazzcash">JazzCash</option>
                  <option value="easypaisa">Easypaisa</option>
                  <option value="cod">COD</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="text-xs">
                Note
                <input
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="e.g. 1st installment"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                />
              </label>
              <button
                type="button"
                disabled={recordingPayment || remainingBalance <= 0}
                onClick={(e) => void recordInstallment(e)}
                className="sm:col-span-2 rounded-xl bg-[#1d6fb8] py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {recordingPayment
                  ? "Saving…"
                  : remainingBalance <= 0
                    ? "Fully paid"
                    : "Add payment"}
              </button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[360px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase text-slate-400 dark:border-slate-800">
                    <th className="py-2 pr-2 font-medium">Date</th>
                    <th className="py-2 pr-2 font-medium">Amount</th>
                    <th className="py-2 pr-2 font-medium">Method</th>
                    <th className="py-2 pr-2 font-medium">Note</th>
                    <th className="py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {!payments.length ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-xs text-slate-400">
                        No payments recorded yet.
                      </td>
                    </tr>
                  ) : (
                    [...payments]
                      .slice()
                      .reverse()
                      .map((p) => (
                        <tr key={p.id || `${p.paidAt}-${p.amount}`} className="border-b border-slate-50 dark:border-slate-800">
                          <td className="py-2 pr-2 whitespace-nowrap text-slate-600">
                            {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "—"}
                          </td>
                          <td className="py-2 pr-2 font-semibold tabular-nums text-emerald-700">
                            {formatAdminPrice(p.amount)}
                          </td>
                          <td className="py-2 pr-2 capitalize text-slate-500">{p.method || "—"}</td>
                          <td className="py-2 pr-2 text-slate-500">{p.note || "—"}</td>
                          <td className="py-2 text-right">
                            <button
                              type="button"
                              onClick={() => void removeInstallment(p.id)}
                              className="text-xs font-semibold text-red-600 hover:underline"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Invoice preview</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <InvoicePreviewFrame
            invoice={previewDraft}
            storeMeta={storeMeta}
            className="h-[720px] w-full bg-white"
            title="Edit invoice preview"
          />
        </div>
      </div>
    </form>
  );
}
