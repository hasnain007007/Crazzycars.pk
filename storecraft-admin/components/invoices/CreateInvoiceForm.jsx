/**
 * Create standalone invoice — saves to Invoices (not Orders), then offers PDF download.
 */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { formatAdminPrice } from "@/lib/currency";
import { getInvoiceStoreMeta } from "@/lib/invoiceStoreMeta";
import { downloadInvoicePdf } from "@/lib/downloadInvoicePdf";
import { invoiceInnerHtml } from "@/components/orders/printOrderDocuments";

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

function productId(product) {
  return String(product?._id || product?.id || "");
}

const PAYMENT_METHOD_OPTIONS = [
  { value: "cod", label: "Cash / COD" },
  { value: "jazzcash", label: "JazzCash" },
  { value: "easypaisa", label: "Easypaisa" },
  { value: "bankTransfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
];

export function CreateInvoiceForm() {
  const router = useRouter();
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    city: "",
    address: "",
    customerId: null,
  });
  const [saveCustomer, setSaveCustomer] = useState(true);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerHits, setCustomerHits] = useState([]);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [paymentStatus, setPaymentStatus] = useState("paid");
  const [deliveryOn, setDeliveryOn] = useState(false);
  const [shippingCost, setShippingCost] = useState("250");
  const [discount, setDiscount] = useState("0");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState([]);
  const [manualName, setManualName] = useState("");
  const [manualQty, setManualQty] = useState("1");
  const [manualPrice, setManualPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedInvoice, setSavedInvoice] = useState(null);
  const [showPdfPrompt, setShowPdfPrompt] = useState(false);
  const [storeMeta, setStoreMeta] = useState(null);

  const [catalog, setCatalog] = useState([]);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogFilter, setCatalogFilter] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    getInvoiceStoreMeta().then(setStoreMeta).catch(() => {});
  }, []);

  useEffect(() => {
    const q = customerQuery.trim();
    if (q.length < 2) {
      setCustomerHits([]);
      return undefined;
    }
    const t = setTimeout(async () => {
      setCustomerSearching(true);
      try {
        const res = await fetch(
          `/api/customers?search=${encodeURIComponent(q)}&limit=8&status=active`,
          { credentials: "include" }
        );
        const json = await res.json();
        if (json.success) setCustomerHits(Array.isArray(json.customers) ? json.customers : []);
        else setCustomerHits([]);
      } catch {
        setCustomerHits([]);
      } finally {
        setCustomerSearching(false);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [customerQuery]);

  function pickCustomer(c) {
    setCustomer({
      name: c.name || "",
      phone: c.phone || "",
      email: c.email && !String(c.email).includes("@guest.") ? c.email : "",
      city: "",
      address: "",
      customerId: c.id,
    });
    setCustomerQuery("");
    setCustomerHits([]);
    toast.success(`Loaded ${c.name}`);
  }

  function clearLinkedCustomer() {
    setCustomer((prev) => ({ ...prev, customerId: null }));
  }

  const loadCatalogPage = useCallback(async (page, append) => {
    if (append) setLoadingMore(true);
    else setCatalogLoading(true);
    try {
      const res = await fetch(`/api/products?status=active&limit=100&page=${page}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        if (!append) toast.error(json.error || "Could not load products.");
        return;
      }
      const rows = Array.isArray(json.data) ? json.data : [];
      setCatalog((prev) => (append ? [...prev, ...rows] : rows));
      setCatalogTotal(Number(json.total) || rows.length);
      setCatalogPage(page);
    } catch {
      if (!append) toast.error("Could not load products.");
    } finally {
      setCatalogLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadCatalogPage(1, false);
  }, [loadCatalogPage]);

  const filteredCatalog = useMemo(() => {
    const q = catalogFilter.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((p) => {
      const name = String(p.name || "").toLowerCase();
      const sku = String(p.inventory?.sku || "").toLowerCase();
      const article = String(p.articleNo || "").toLowerCase();
      return name.includes(q) || sku.includes(q) || article.includes(q);
    });
  }, [catalog, catalogFilter]);

  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + lineTotal(line.quantity, line.unitPrice), 0),
    [lines]
  );
  const discountNum = Math.max(0, Number(discount) || 0);
  const shipNum = deliveryOn ? Math.max(0, Number(shippingCost) || 0) : 0;
  const total = Math.max(0, Math.round((subtotal - discountNum + shipNum) * 100) / 100);

  const addProduct = useCallback((product) => {
    const id = productId(product);
    setLines((prev) => {
      const existing = prev.findIndex((l) => l.productId === id && id);
      if (existing >= 0) {
        return prev.map((l, i) =>
          i === existing ? { ...l, quantity: Math.min(999, l.quantity + 1) } : l
        );
      }
      return [
        ...prev,
        {
          key: `new-${id || "x"}-${Date.now()}`,
          productId: id || null,
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
    const quantity = Math.max(1, Math.min(999, Math.round(Number(manualQty) || 1)));
    const unitPrice = Math.max(0, Number(manualPrice) || 0);
    setLines((prev) => [
      ...prev,
      {
        key: `manual-${Date.now()}`,
        productId: null,
        name,
        image: "",
        variation: "Manual",
        quantity,
        unitPrice,
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

  function handlePdfYes() {
    if (savedInvoice) {
      try {
        downloadInvoicePdf(savedInvoice, storeMeta || {});
        toast.success("Print dialog opened — choose “Save as PDF”.");
      } catch {
        toast.error("Could not open PDF print.");
      }
    }
    setShowPdfPrompt(false);
    router.push("/invoices");
  }

  function handlePdfNo() {
    setShowPdfPrompt(false);
    router.push("/invoices");
  }

  async function submit(e) {
    e.preventDefault();
    if (!customer.name.trim()) {
      toast.error("Customer name is required.");
      return;
    }
    if (!customer.phone.trim()) {
      toast.error("Customer phone is required.");
      return;
    }
    if (!lines.length) {
      toast.error("Add at least one item (catalog or manual).");
      return;
    }

    setSaving(true);
    try {
      const method = paymentMethod === "card" ? "bankTransfer" : paymentMethod;
      const res = await fetch("/api/invoices", {
        method: "POST",
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
          saveCustomer,
          items: lines.map((line) => ({
            productId: line.productId,
            name: line.name,
            image: line.image,
            variation: line.variation,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            total: lineTotal(line.quantity, line.unitPrice),
          })),
          shippingCost: shipNum,
          discount: discountNum,
          paymentMethod: method,
          paymentStatus,
          note: note.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Could not save invoice.");
        return;
      }
      toast.success(`Invoice ${json.invoice.invoiceNumber} saved`);
      setSavedInvoice(json.invoice);
      setShowPdfPrompt(true);
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  const hasMore = catalog.length < catalogTotal;

  const previewDraft = useMemo(() => {
    const method = paymentMethod === "card" ? "bankTransfer" : paymentMethod;
    return {
      invoiceNumber: "PREVIEW",
      createdAt: new Date().toISOString(),
      customer: {
        name: customer.name.trim() || "Customer name",
        phone: customer.phone.trim() || "—",
        email: customer.email.trim(),
      },
      shippingAddress: {
        name: customer.name.trim(),
        phone: customer.phone.trim(),
        email: customer.email.trim(),
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
      pricing: {
        subtotal,
        discount: discountNum,
        shippingCost: shipNum,
        total,
      },
      paymentMethod: method,
      paymentStatus,
      note: note.trim(),
      currency: storeMeta?.currency || "PKR",
    };
  }, [
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
  ]);

  const previewSrcDoc = useMemo(() => {
    const body = invoiceInnerHtml(previewDraft, storeMeta || {});
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
      <style>
        body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; background: #fff; color: #111; }
      </style></head><body>${body}</body></html>`;
  }, [previewDraft, storeMeta]);

  return (
    <>
      <form onSubmit={submit} className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">New invoice</h1>
            <p className="mt-1 text-sm text-slate-500">
              Saves to Invoices only — does not create an order.
            </p>
          </div>
          <Link
            href="/invoices"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            All invoices
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Product catalog</h2>
                  <p className="text-xs text-slate-400">
                    {catalogLoading
                      ? "Loading…"
                      : `${catalogTotal} active product${catalogTotal === 1 ? "" : "s"}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => loadCatalogPage(1, false)}
                  className="text-xs font-semibold text-[#1A7A4C] hover:underline"
                >
                  Refresh
                </button>
              </div>
              <input
                type="search"
                value={catalogFilter}
                onChange={(e) => setCatalogFilter(e.target.value)}
                placeholder="Filter loaded products…"
                className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
              />
              <div className="mt-3 max-h-[28rem] space-y-1 overflow-y-auto">
                {catalogLoading ? (
                  <p className="py-10 text-center text-sm text-slate-400">Fetching products…</p>
                ) : !filteredCatalog.length ? (
                  <p className="py-10 text-center text-sm text-slate-400">
                    No products found. Add products in Catalog first.
                  </p>
                ) : (
                  filteredCatalog.map((p) => {
                    const id = productId(p);
                    const stock = Number(p.inventory?.quantity);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => addProduct(p)}
                        className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                      >
                        {productImage(p) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={productImage(p)}
                            alt=""
                            className="h-10 w-10 rounded-lg object-cover bg-slate-100"
                          />
                        ) : (
                          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
                            —
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                            {p.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {formatAdminPrice(productUnitPrice(p))}
                            {Number.isFinite(stock) ? ` · stock ${stock}` : ""}
                          </p>
                        </div>
                        <span className="text-lg font-bold text-[#1A7A4C]">+</span>
                      </button>
                    );
                  })
                )}
              </div>
              {hasMore ? (
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => loadCatalogPage(catalogPage + 1, true)}
                  className="mt-3 w-full rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200"
                >
                  {loadingMore ? "Loading…" : `Load more (${catalog.length}/${catalogTotal})`}
                </button>
              ) : null}
            </div>
          </div>

          <div className="space-y-5 lg:col-span-7">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Customer</h2>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={saveCustomer}
                    onChange={(e) => setSaveCustomer(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Save / update customer record
                </label>
              </div>

              <div className="relative mt-3">
                <label className="block text-xs font-medium text-slate-500">
                  Find existing customer
                  <input
                    type="search"
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                    placeholder="Search by name, phone, or email…"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                  />
                </label>
                {customerSearching ? (
                  <p className="mt-1 text-xs text-slate-400">Searching…</p>
                ) : null}
                {customerHits.length > 0 ? (
                  <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-900">
                    {customerHits.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => pickCustomer(c)}
                          className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                        >
                          <span className="font-medium text-slate-800 dark:text-slate-100">{c.name}</span>
                          <span className="text-xs text-slate-400">
                            {c.phone || "—"} · {c.email || "—"}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              {customer.customerId ? (
                <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
                  Linked to saved customer ·{" "}
                  <Link href={`/customers/${customer.customerId}`} className="font-semibold underline">
                    View profile
                  </Link>
                  {" · "}
                  <button type="button" onClick={clearLinkedCustomer} className="font-semibold underline">
                    Unlink
                  </button>
                </p>
              ) : null}

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-xs font-medium text-slate-500 sm:col-span-2">
                  Name *
                  <input
                    required
                    value={customer.name}
                    onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-500">
                  Phone *
                  <input
                    required
                    value={customer.phone}
                    onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-500">
                  Email
                  <input
                    type="email"
                    value={customer.email}
                    onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-500">
                  City
                  <input
                    value={customer.city}
                    onChange={(e) => setCustomer((c) => ({ ...c, city: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-500">
                  Address
                  <input
                    value={customer.address}
                    onChange={(e) => setCustomer((c) => ({ ...c, address: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Line items</h2>
              <p className="mt-1 text-xs text-slate-400">
                Pick from catalog or add a custom / manual item below.
              </p>

              <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-800/50">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Manual item
                </p>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-12">
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="Item name *"
                    className="sm:col-span-5 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addManualItem();
                      }
                    }}
                  />
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={manualQty}
                    onChange={(e) => setManualQty(e.target.value)}
                    placeholder="Qty"
                    className="sm:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={manualPrice}
                    onChange={(e) => setManualPrice(e.target.value)}
                    placeholder="Unit price"
                    className="sm:col-span-3 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                  />
                  <button
                    type="button"
                    onClick={addManualItem}
                    className="sm:col-span-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {!lines.length ? (
                <p className="mt-6 text-center text-sm text-slate-400">
                  No items yet — use the catalog or add a manual item.
                </p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400">
                        <th className="py-2 pr-2">Product</th>
                        <th className="py-2 px-2">Qty</th>
                        <th className="py-2 px-2">Price</th>
                        <th className="py-2 px-2">Total</th>
                        <th className="py-2 pl-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {lines.map((line, idx) => (
                        <tr key={line.key}>
                          <td className="py-2 pr-2 font-medium text-slate-800 dark:text-slate-100">
                            <input
                              type="text"
                              value={line.name}
                              onChange={(e) => updateLine(idx, { name: e.target.value })}
                              className="w-full min-w-[8rem] rounded border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-slate-200 focus:border-slate-300 dark:focus:border-slate-600"
                            />
                            {!line.productId ? (
                              <span className="ml-1 text-[10px] font-semibold uppercase text-slate-400">
                                manual
                              </span>
                            ) : null}
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min={1}
                              max={999}
                              value={line.quantity}
                              onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                              className="w-16 rounded border border-slate-200 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-950"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={line.unitPrice}
                              onChange={(e) => updateLine(idx, { unitPrice: e.target.value })}
                              className="w-24 rounded border border-slate-200 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-950"
                            />
                          </td>
                          <td className="py-2 px-2 tabular-nums font-semibold">
                            {formatAdminPrice(lineTotal(line.quantity, line.unitPrice))}
                          </td>
                          <td className="py-2 pl-2">
                            <button
                              type="button"
                              onClick={() => removeLine(idx)}
                              className="text-xs font-semibold text-red-600 hover:underline"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Payment & totals</h2>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-xs font-medium text-slate-500">
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
                <label className="block text-xs font-medium text-slate-500">
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
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={deliveryOn}
                    onChange={(e) => setDeliveryOn(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Add delivery charge
                </label>
                {deliveryOn ? (
                  <label className="block text-xs font-medium text-slate-500">
                    Shipping (Rs)
                    <input
                      type="number"
                      min={0}
                      value={shippingCost}
                      onChange={(e) => setShippingCost(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                    />
                  </label>
                ) : null}
                <label className="block text-xs font-medium text-slate-500">
                  Discount (Rs)
                  <input
                    type="number"
                    min={0}
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-500 sm:col-span-2">
                  Note
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Optional"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                  />
                </label>
              </div>

              <div className="mt-4 space-y-1 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatAdminPrice(subtotal)}</span>
                </div>
                {discountNum > 0 ? (
                  <div className="flex justify-between text-slate-500">
                    <span>Discount</span>
                    <span className="tabular-nums">−{formatAdminPrice(discountNum)}</span>
                  </div>
                ) : null}
                {shipNum > 0 ? (
                  <div className="flex justify-between text-slate-500">
                    <span>Shipping</span>
                    <span className="tabular-nums">{formatAdminPrice(shipNum)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-base font-bold text-slate-900 dark:text-white">
                  <span>Total</span>
                  <span className="tabular-nums text-[#1A7A4C]">{formatAdminPrice(total)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving || showPdfPrompt}
                className="mt-5 w-full rounded-xl bg-[#1A7A4C] px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#15663f] disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save invoice"}
              </button>
            </div>
          </div>
        </div>

        {/* Live professional preview */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Invoice preview</h2>
              <p className="text-xs text-slate-400">
                Live preview with your logo and store details — updates as you edit.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                try {
                  downloadInvoicePdf(previewDraft, storeMeta || {});
                  toast.success("Print dialog opened — choose “Save as PDF” to test.");
                } catch {
                  toast.error("Could not open preview print.");
                }
              }}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200"
            >
              Print preview
            </button>
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-950">
            <iframe
              title="Invoice preview"
              srcDoc={previewSrcDoc}
              className="h-[720px] w-full bg-white"
              sandbox=""
            />
          </div>
        </div>
      </form>

      {showPdfPrompt && savedInvoice ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Invoice saved</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              <span className="font-mono font-semibold">{savedInvoice.invoiceNumber}</span> is saved in
              Invoices (not Orders). Download PDF now?
            </p>
            <p className="mt-1 text-xs text-slate-400">
              In the print dialog, choose “Save as PDF” / “Microsoft Print to PDF”.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handlePdfNo}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200"
              >
                Not now
              </button>
              <button
                type="button"
                onClick={handlePdfYes}
                className="rounded-xl bg-[#1A7A4C] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#15663f]"
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
