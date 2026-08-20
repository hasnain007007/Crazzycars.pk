/**
 * Editable order line items: qty, unit price, variation, add-ons, delivery.
 */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { formatAdminPrice } from "@/lib/currency";

function formatMoney(n) {
  return formatAdminPrice(Number(n) || 0);
}

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
  return product?.image || "";
}

function enabledSimpleVariations(product) {
  return (product?.simpleVariations || []).filter(
    (v) => v?.enabled && Array.isArray(v.tags) && v.tags.length > 0
  );
}

function legacyVariationChoices(product) {
  return (product?.variations || [])
    .map((v) => {
      const name = String(v?.name || "").trim();
      if (!name) return null;
      const opts = Array.isArray(v.options)
        ? v.options
            .map((o) => (typeof o === "string" ? o : o?.value || o?.label || ""))
            .map((s) => String(s || "").trim())
            .filter(Boolean)
        : [];
      return {
        name,
        options: opts,
        additionalPrice: Number(v.additionalPrice ?? v.extraPrice) || 0,
      };
    })
    .filter(Boolean);
}

function findMatchedCombo(product, selectedOptions) {
  const combos = Array.isArray(product?.variationCombinations) ? product.variationCombinations : [];
  if (!combos.length) return null;
  const entries = Object.entries(selectedOptions || {}).filter(([, v]) => String(v || "").trim());
  if (!entries.length) return null;
  return (
    combos.find((combo) => {
      const opts = Array.isArray(combo?.options) ? combo.options : [];
      if (!opts.length) return false;
      return opts.every((o) => selectedOptions[o.name] === o.value);
    }) || null
  );
}

function computeUnitPrice(basePrice, combo, selectedAddOns, legacyExtra = 0) {
  let price = Math.max(0, Number(basePrice) || 0);
  if (combo) {
    const comboPrice = Number(combo.price);
    if (Number.isFinite(comboPrice) && comboPrice > 0) price = comboPrice;
    else price = price + (Number(combo.priceDelta) || 0);
  } else {
    price += Math.max(0, Number(legacyExtra) || 0);
  }
  for (const a of selectedAddOns || []) {
    price += Math.max(0, Number(a.price) || 0);
  }
  return Math.max(0, Math.round(price * 100) / 100);
}

function buildVariationLabel(selectedOptions, selectedAddOns) {
  const parts = Object.entries(selectedOptions || {})
    .filter(([, v]) => String(v || "").trim())
    .map(([k, v]) => `${k}: ${v}`);
  if ((selectedAddOns || []).length) {
    parts.push(`Add-ons: ${selectedAddOns.map((a) => a.name).join(", ")}`);
  }
  return parts.join(" · ").slice(0, 200);
}

function parseSelectedOptionsFromVariation(variation) {
  const out = {};
  String(variation || "")
    .split(/[·,]/)
    .map((s) => s.trim())
    .forEach((part) => {
      if (/^add-ons:/i.test(part)) return;
      const idx = part.indexOf(":");
      if (idx > 0) {
        const key = part.slice(0, idx).trim();
        const val = part.slice(idx + 1).trim();
        if (key && val) out[key] = val;
      }
    });
  return out;
}

function normalizeLines(items) {
  return (items || []).map((item, idx) => {
    const selectedAddOns = Array.isArray(item.selectedAddOns)
      ? item.selectedAddOns
          .map((a) => ({ name: String(a?.name || "").trim(), price: Math.max(0, Number(a?.price) || 0) }))
          .filter((a) => a.name)
      : [];
    const selectedOptions =
      item.selectedVariation && typeof item.selectedVariation === "object" && item.selectedVariation.selectedOptions
        ? item.selectedVariation.selectedOptions
        : parseSelectedOptionsFromVariation(item.variation);
    return {
      key: `${item.productId || "custom"}-${idx}-${item.name || ""}`,
      productId: item.productId || null,
      name: item.name || "",
      image: item.image || "",
      variation: item.variation || "",
      selectedOptions,
      selectedAddOns,
      quantity: Math.max(1, Number(item.quantity) || 1),
      unitPrice: Math.max(0, Number(item.unitPrice) || 0),
      basePrice: Math.max(0, Number(item.unitPrice) || 0),
      catalog: null,
    };
  });
}

function extractCatalog(product) {
  if (!product) return null;
  return {
    id: String(product._id || product.id || ""),
    name: product.name || "",
    basePrice: productUnitPrice(product),
    image: productImage(product),
    simpleVariations: enabledSimpleVariations(product),
    variationCombinations: Array.isArray(product.variationCombinations) ? product.variationCombinations : [],
    legacyVariations: legacyVariationChoices(product),
    addOns: Array.isArray(product.addOns)
      ? product.addOns
          .map((a) => ({
            name: String(a?.name || "").trim(),
            price: Math.max(0, Number(a?.price) || 0),
            required: Boolean(a?.required),
          }))
          .filter((a) => a.name)
      : [],
  };
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
  const [loadingMeta, setLoadingMeta] = useState({});

  useEffect(() => {
    setLines(normalizeLines(order.items));
    const ship = Number(order?.pricing?.shippingCost) || 0;
    setDeliveryOn(ship > 0);
    if (ship > 0) setShippingCost(String(ship));
  }, [order.id, order.items, order?.pricing?.shippingCost]);

  const loadProductMeta = useCallback(async (productId) => {
    if (!productId) return null;
    setLoadingMeta((m) => ({ ...m, [productId]: true }));
    try {
      const res = await fetch(`/api/products/${productId}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) return null;
      return extractCatalog(json.data);
    } catch {
      return null;
    } finally {
      setLoadingMeta((m) => ({ ...m, [productId]: false }));
    }
  }, []);

  // Hydrate catalog options for existing lines and reprice from combo when Style is known
  useEffect(() => {
    let cancelled = false;
    const ids = [...new Set(lines.map((l) => l.productId).filter(Boolean))];
    if (!ids.length) return undefined;
    (async () => {
      for (const id of ids) {
        if (cancelled) return;
        const already = lines.find((l) => l.productId === id && l.catalog);
        if (already) continue;
        const catalog = await loadProductMeta(id);
        if (!catalog || cancelled) continue;
        setLines((prev) =>
          prev.map((line) => {
            if (line.productId !== id || line.catalog) return line;
            const base = catalog.basePrice || line.basePrice || line.unitPrice;
            const next = { ...line, catalog, basePrice: base };
            if (Object.keys(line.selectedOptions || {}).length > 0) {
              return repriceLine(next);
            }
            return next;
          })
        );
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once per order item set
  }, [order.id, loadProductMeta, repriceLine]);

  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + lineTotal(line.quantity, line.unitPrice), 0),
    [lines]
  );
  const shipNum = deliveryOn ? Math.max(0, Number(shippingCost) || 0) : 0;
  const total = Math.max(0, Math.round((subtotal - discount + shipNum) * 100) / 100);

  const repriceLine = useCallback((line, patch = {}) => {
    const next = { ...line, ...patch };
    const catalog = next.catalog;
    const selectedOptions = next.selectedOptions || {};
    const selectedAddOns = next.selectedAddOns || [];
    const combo = catalog ? findMatchedCombo(catalog, selectedOptions) : null;

    let legacyExtra = 0;
    if (catalog?.legacyVariations?.length && !catalog.simpleVariations?.length) {
      for (const lv of catalog.legacyVariations) {
        const chosen = selectedOptions[lv.name];
        if (chosen) legacyExtra += Number(lv.additionalPrice) || 0;
      }
    }

    const base = Number(next.basePrice);
    const priceBase = Number.isFinite(base) && base >= 0 ? base : catalog?.basePrice || next.unitPrice;
    next.unitPrice = computeUnitPrice(priceBase, combo, selectedAddOns, legacyExtra);
    next.variation = buildVariationLabel(selectedOptions, selectedAddOns);
    next.selectedVariation = {
      selectedOptions,
      combinationId: combo?._id ? String(combo._id) : null,
    };
    if (combo?.image) next.image = combo.image;
    return next;
  }, []);

  const updateLine = useCallback(
    (index, patch) => {
      setLines((prev) =>
        prev.map((line, i) => {
          if (i !== index) return line;
          let next = { ...line, ...patch };
          if (patch.quantity != null) next.quantity = Math.max(1, Math.min(999, Number(patch.quantity) || 1));
          if (
            patch.selectedOptions != null ||
            patch.selectedAddOns != null ||
            patch.catalog != null ||
            patch.basePrice != null
          ) {
            next = repriceLine(next);
          } else if (patch.unitPrice != null) {
            next.unitPrice = Math.max(0, Number(patch.unitPrice) || 0);
          }
          return next;
        })
      );
    },
    [repriceLine]
  );

  const setOption = useCallback(
    (index, optionName, value) => {
      setLines((prev) =>
        prev.map((line, i) => {
          if (i !== index) return line;
          const selectedOptions = { ...(line.selectedOptions || {}), [optionName]: value };
          return repriceLine({ ...line, selectedOptions });
        })
      );
    },
    [repriceLine]
  );

  const toggleAddOn = useCallback(
    (index, addon, checked) => {
      setLines((prev) =>
        prev.map((line, i) => {
          if (i !== index) return line;
          const selectedAddOns = checked
            ? [...(line.selectedAddOns || []).filter((a) => a.name !== addon.name), { name: addon.name, price: addon.price }]
            : (line.selectedAddOns || []).filter((a) => a.name !== addon.name);
          return repriceLine({ ...line, selectedAddOns });
        })
      );
    },
    [repriceLine]
  );

  const removeLine = useCallback((index) => {
    setLines((prev) => {
      if (prev.length <= 1) {
        toast.error("Order must keep at least one product.");
        return prev;
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const addProduct = useCallback(
    async (productLite) => {
      const id = productLite._id || productLite.id;
      const catalog = id ? await loadProductMeta(id) : extractCatalog(productLite);
      const base = catalog?.basePrice ?? productUnitPrice(productLite);
      const selectedOptions = {};
      for (const v of catalog?.simpleVariations || []) {
        if (v.tags?.length === 1) selectedOptions[v.name] = v.tags[0];
      }
      const requiredAddOns = (catalog?.addOns || []).filter((a) => a.required);
      let line = {
        key: `new-${id || "x"}-${Date.now()}`,
        productId: id || null,
        name: catalog?.name || productLite.name || "Product",
        image: catalog?.image || productImage(productLite),
        variation: "",
        selectedOptions,
        selectedAddOns: requiredAddOns.map((a) => ({ name: a.name, price: a.price })),
        quantity: 1,
        unitPrice: base,
        basePrice: base,
        catalog,
      };
      line = repriceLine(line);
      setLines((prev) => [...prev, line]);
      setShowAdd(false);
      setSearch("");
      setResults([]);
      toast.success("Product added — choose variation/add-ons, then save.");
    },
    [loadProductMeta, repriceLine]
  );

  useEffect(() => {
    if (!showAdd) return undefined;
    const q = search.trim();
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ status: "active", limit: "50" });
        if (q.length >= 1) params.set("search", q);
        const res = await fetch(`/api/products?${params}`, { credentials: "include" });
        const json = await res.json();
        if (json.success) setResults(Array.isArray(json.data) ? json.data : []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, q.length ? 280 : 0);
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
        variation: line.variation || buildVariationLabel(line.selectedOptions, line.selectedAddOns),
        selectedVariation: line.selectedVariation || {
          selectedOptions: line.selectedOptions || {},
        },
        selectedAddOns: line.selectedAddOns || [],
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
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
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
            placeholder="Filter products (all active load automatically)"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
            autoFocus
          />
          {searching ? <p className="mt-2 text-xs text-slate-500">Loading catalog…</p> : null}
          {results.length > 0 ? (
            <ul className="mt-2 max-h-64 overflow-y-auto divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white dark:divide-slate-700 dark:border-slate-600 dark:bg-slate-900">
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

      <div className="mt-2 overflow-x-auto">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b border-slate-200 text-[10px] font-semibold uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <tr>
              <th className="w-12 py-1.5 pr-1">Img</th>
              <th className="py-1.5 pr-1">Product</th>
              <th className="w-[22%] py-1.5 pr-1">Variation</th>
              <th className="w-[22%] py-1.5 pr-1">Add-ons</th>
              <th className="w-24 py-1.5 pr-1 text-right">Qty</th>
              <th className="w-24 py-1.5 pr-1 text-right">Price</th>
              <th className="w-20 py-1.5 pr-1 text-right">Total</th>
              <th className="w-14 py-1.5 text-right"> </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {lines.map((item, idx) => {
              const catalog = item.catalog;
              const simpleVars = catalog?.simpleVariations || [];
              const legacyVars = !simpleVars.length ? catalog?.legacyVariations || [] : [];
              const addOns = catalog?.addOns || [];
              const metaLoading = item.productId && loadingMeta[item.productId] && !catalog;

              return (
                <tr key={item.key} className="align-top">
                  <td className="py-2 pr-2">
                    <div className="h-10 w-10 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full items-center justify-center text-[10px] text-slate-400">—</span>
                      )}
                    </div>
                  </td>
                  <td className="min-w-0 py-1.5 pr-1 text-xs font-medium text-slate-900 dark:text-white">
                    {item.name}
                    {item.variation ? (
                      <p className="mt-0.5 text-[11px] font-normal text-slate-500">{item.variation}</p>
                    ) : null}
                  </td>
                  <td className="py-2 pr-2">
                    {metaLoading ? (
                      <span className="text-xs text-slate-400">Loading…</span>
                    ) : simpleVars.length ? (
                      <div className="space-y-1.5">
                        {simpleVars.map((v) => (
                          <label key={v.name} className="block">
                            <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                              {v.name}
                            </span>
                            <select
                              value={item.selectedOptions?.[v.name] || ""}
                              onChange={(e) => setOption(idx, v.name, e.target.value)}
                              className="w-full rounded border border-slate-200 px-1.5 py-1 text-xs dark:border-slate-600 dark:bg-slate-800"
                            >
                              <option value="">Select…</option>
                              {v.tags.map((tag) => (
                                <option key={tag} value={tag}>
                                  {tag}
                                </option>
                              ))}
                            </select>
                          </label>
                        ))}
                      </div>
                    ) : legacyVars.length ? (
                      <div className="space-y-1.5">
                        {legacyVars.map((v) => (
                          <label key={v.name} className="block">
                            <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                              {v.name}
                            </span>
                            <select
                              value={item.selectedOptions?.[v.name] || ""}
                              onChange={(e) => setOption(idx, v.name, e.target.value)}
                              className="w-full rounded border border-slate-200 px-1.5 py-1 text-xs dark:border-slate-600 dark:bg-slate-800"
                            >
                              <option value="">Select…</option>
                              {(v.options.length ? v.options : [v.name]).map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                  {v.additionalPrice ? ` (+${v.additionalPrice})` : ""}
                                </option>
                              ))}
                            </select>
                          </label>
                        ))}
                      </div>
                    ) : item.productId ? (
                      <span className="text-xs text-slate-400">No variations</span>
                    ) : (
                      <input
                        type="text"
                        value={item.variation}
                        onChange={(e) => updateLine(idx, { variation: e.target.value })}
                        placeholder="Optional"
                        className="w-full max-w-[160px] rounded border border-slate-200 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800"
                      />
                    )}
                  </td>
                  <td className="py-2 pr-2">
                    {metaLoading ? (
                      <span className="text-xs text-slate-400">Loading…</span>
                    ) : addOns.length ? (
                      <div className="space-y-1">
                        {addOns.map((addon) => {
                          const checked = (item.selectedAddOns || []).some((a) => a.name === addon.name);
                          return (
                            <label
                              key={addon.name}
                              className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-200"
                            >
                              <input
                                type="checkbox"
                                className="mt-0.5"
                                checked={checked}
                                onChange={(e) => toggleAddOn(idx, addon, e.target.checked)}
                              />
                              <span>
                                {addon.name}
                                {addon.required ? " *" : ""}
                                <span className="text-slate-500"> (+{formatMoney(addon.price)})</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
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
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
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

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={deliveryOn}
              onClick={() => setDeliveryOn((v) => !v)}
              className={[
                "relative h-6 w-10 shrink-0 rounded-full transition",
                deliveryOn ? "bg-[#1d6fb8]" : "bg-slate-300 dark:bg-slate-600",
              ].join(" ")}
            >
              <span
                className={[
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition",
                  deliveryOn ? "left-4" : "left-0.5",
                ].join(" ")}
              />
            </button>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
              {deliveryOn ? "Delivery on" : "Delivery off"}
            </span>
          </div>
          {deliveryOn ? (
            <input
              type="number"
              min={0}
              step="1"
              aria-label="Shipping amount"
              value={shippingCost}
              onChange={(e) => setShippingCost(e.target.value)}
              className="w-28 rounded-lg border border-slate-200 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-900"
            />
          ) : null}
        </div>

        <div className="mt-1.5 flex justify-between py-0.5">
          <span className="text-slate-600 dark:text-slate-400">Shipping</span>
          <span className="tabular-nums">{formatMoney(shipNum)}</span>
        </div>
        <div className="mt-1.5 flex justify-between border-t border-slate-200 pt-1.5 text-base font-bold dark:border-slate-700">
          <span>Total</span>
          <span className="tabular-nums">{formatMoney(total)}</span>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="mt-3 w-full rounded-lg bg-[#1d6fb8] py-2 text-sm font-semibold text-white hover:bg-[#185d9c] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save order changes"}
        </button>
      </div>
    </div>
  );
}
