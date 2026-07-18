/**
 * Editable order line items: qty, unit price, add/remove products, delivery on/off.
 */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { formatAdminPrice } from "@/lib/currency";

function formatMoney(n) {
  return formatAdminPrice(Number(n) || 0);
}

function lineTotal(qty, unitPrice) {
  return Math.round((Math.max(0, Number(qty) || 0) * Math.max(0, Number(unitPrice) || 0)) * 100) / 100;
}

function normalizeLines(items) {
  return (items || []).map((item, idx) => ({
    key: `${item.productId || "custom"}-${idx}-${item.name || ""}`,
    productId: item.productId || null,
    name: item.name || "",
    image: item.image || "",
    variation: item.variation || "",
    quantity: Math.max(1, Number(item.quantity) || 1),
    unitPrice: Math.max(0, Number(item.unitPrice) || 0),
    customMeasurements: item.customMeasurements || item.selectedVariation || null,
  }));
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
  return product?.image || "";
}

export function OrderItemsEditor({ order, onUpdated }) {
  const discount = Number(order?.pricing?.discount) || 0;
  const [lines, setLines] = useState(() => normalizeLines(order.items));
  const [deliveryOn, setDeliveryOn] = useState(() => Number(order?.pricing?.shippingCost) > 0);
  const [shippingCost, setShippingCost] = useState(() => {
    const s = Number(order?.pricing?.shippingCost) || 0;
    return s > 0 ? String(s) : "250";
  });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    setLines(normalizeLines(order.items));
    const ship = Number(order?.pricing?.shippingCost) || 0;
    setDeliveryOn(ship > 0);
    if (ship > 0) setShippingCost(String(ship));
  }, [order.id, order.items, order?.pricing?.shippingCost]);

  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + lineTotal(line.quantity, line.unitPrice), 0),
    [lines]
  );
  const shipNum = deliveryOn ? Math.max(0, Number(shippingCost) || 0) : 0;
  const total = Math.max(0, Math.round((subtotal - discount + shipNum) * 100) / 100);

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
    setLines((prev) => {
      if (prev.length <= 1) {
        toast.error("Order must keep at least one product.");
        return prev;
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const addProduct = useCallback((product) => {
    const price = productUnitPrice(product);
    setLines((prev) => [
      ...prev,
      {
        key: `new-${product._id || product.id}-${Date.now()}`,
        productId: product._id || product.id || null,
        name: product.name || "Product",
        image: productImage(product),
        variation: "",
        quantity: 1,
        unitPrice: price,
        customMeasurements: null,
      },
    ]);
    setShowAdd(false);
    setSearch("");
    setResults([]);
    toast.success("Product added — save to apply.");
  }, []);

  useEffect(() => {
    if (!showAdd) return undefined;
    const q = search.trim();
    if (q.length < 2) {
      setResults([]);
      return undefined;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/products?search=${encodeURIComponent(q)}&status=active&limit=8`,
          { credentials: "include" }
        );
        const json = await res.json();
        if (json.success) setResults(Array.isArray(json.data) ? json.data : []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [search, showAdd]);

  async function save() {
    if (!lines.length) {
      toast.error("Add at least one product.");
      return;
    }
    setSaving(true);
    try {
      const items = lines.map((line) => ({
        productId: line.productId,
        name: line.name,
        image: line.image,
        variation: line.variation,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        total: lineTotal(line.quantity, line.unitPrice),
      }));
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          shippingCost: shipNum,
          deliveryEnabled: deliveryOn,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Could not save order items.");
        return;
      }
      toast.success("Order items updated.");
      onUpdated(json.order);
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Order items</h2>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        >
          {showAdd ? "Close search" : "+ Add product"}
        </button>
      </div>

      {showAdd ? (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-800/60">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
            Search catalog
          </label>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type product name (min 2 characters)"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
            autoFocus
          />
          {searching ? <p className="mt-2 text-xs text-slate-500">Searching…</p> : null}
          {results.length > 0 ? (
            <ul className="mt-2 max-h-48 overflow-y-auto divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white dark:divide-slate-700 dark:border-slate-600 dark:bg-slate-900">
              {results.map((product) => (
                <li key={product._id || product.id}>
                  <button
                    type="button"
                    onClick={() => addProduct(product)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                      {productImage(product) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={productImage(product)} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900 dark:text-white">{product.name}</p>
                      <p className="text-xs text-slate-500">{formatMoney(productUnitPrice(product))}</p>
                    </div>
                    <span className="text-xs font-semibold text-[#1d6fb8]">Add</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : search.trim().length >= 2 && !searching ? (
            <p className="mt-2 text-xs text-slate-500">No products found.</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <tr>
              <th className="py-2 pr-2">Image</th>
              <th className="py-2 pr-2">Product</th>
              <th className="py-2 pr-2">Variation</th>
              <th className="py-2 pr-2 text-right">Qty</th>
              <th className="py-2 pr-2 text-right">Unit price</th>
              <th className="py-2 pr-2 text-right">Line total</th>
              <th className="py-2 text-right"> </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {lines.map((item, idx) => (
              <tr key={item.key}>
                <td className="py-2 pr-2">
                  <div className="h-12 w-12 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center text-[10px] text-slate-400">—</span>
                    )}
                  </div>
                </td>
                <td className="py-2 pr-2 font-medium text-slate-900 dark:text-white">{item.name}</td>
                <td className="py-2 pr-2 text-slate-600 dark:text-slate-300">{item.variation || "—"}</td>
                <td className="py-2 pr-2">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() => updateLine(idx, { quantity: item.quantity - 1 })}
                      className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 text-sm font-bold hover:bg-slate-50 dark:border-slate-600"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={item.quantity}
                      onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                      className="w-14 rounded border border-slate-200 px-1 py-1 text-right text-sm tabular-nums dark:border-slate-600 dark:bg-slate-800"
                    />
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() => updateLine(idx, { quantity: item.quantity + 1 })}
                      className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 text-sm font-bold hover:bg-slate-50 dark:border-slate-600"
                    >
                      +
                    </button>
                  </div>
                </td>
                <td className="py-2 pr-2 text-right">
                  <input
                    type="number"
                    min={0}
                    step="1"
                    value={item.unitPrice}
                    onChange={(e) => updateLine(idx, { unitPrice: e.target.value })}
                    className="ml-auto w-24 rounded border border-slate-200 px-2 py-1 text-right text-sm tabular-nums dark:border-slate-600 dark:bg-slate-800"
                  />
                </td>
                <td className="py-2 pr-2 text-right tabular-nums font-medium">
                  {formatMoney(lineTotal(item.quantity, item.unitPrice))}
                </td>
                <td className="py-2 text-right">
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

      <div className="mt-4 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
        <div className="flex justify-between py-0.5">
          <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
          <span className="tabular-nums">{formatMoney(subtotal)}</span>
        </div>
        {discount > 0 ? (
          <div className="flex justify-between py-0.5 text-emerald-700 dark:text-emerald-400">
            <span>Discount</span>
            <span className="tabular-nums">−{formatMoney(discount)}</span>
          </div>
        ) : null}

        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-800/50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Delivery</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {deliveryOn ? "Delivery charge on" : "Delivery off (free / no shipping)"}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={deliveryOn}
              onClick={() => setDeliveryOn((v) => !v)}
              className={[
                "relative h-7 w-12 rounded-full transition",
                deliveryOn ? "bg-[#1d6fb8]" : "bg-slate-300 dark:bg-slate-600",
              ].join(" ")}
            >
              <span
                className={[
                  "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition",
                  deliveryOn ? "left-5" : "left-0.5",
                ].join(" ")}
              />
            </button>
          </div>
          {deliveryOn ? (
            <div className="mt-3">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                Shipping / delivery amount (Rs.)
              </label>
              <input
                type="number"
                min={0}
                step="1"
                value={shippingCost}
                onChange={(e) => setShippingCost(e.target.value)}
                className="mt-1 w-full max-w-[160px] rounded-lg border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"
              />
            </div>
          ) : null}
        </div>

        <div className="mt-2 flex justify-between py-0.5">
          <span className="text-slate-600 dark:text-slate-400">Shipping</span>
          <span className="tabular-nums">{formatMoney(shipNum)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-lg font-bold dark:border-slate-700">
          <span>Total</span>
          <span className="tabular-nums">{formatMoney(total)}</span>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="mt-4 w-full rounded-lg bg-[#1d6fb8] py-2.5 text-sm font-semibold text-white hover:bg-[#185d9c] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save order changes"}
        </button>
      </div>
    </div>
  );
}
