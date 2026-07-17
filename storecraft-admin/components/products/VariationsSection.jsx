"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { formatAdminPrice } from "@/lib/currency";
import { TagInput } from "../ui/TagInput";

export default function VariationsSection({ form, setForm }) {
  const [productOptions, setProductOptions] = useState([]);
  const simpleVariations = form.simpleVariations || [];

  const [newCombo, setNewCombo] = useState({});
  const [newWeight, setNewWeight] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newStock, setNewStock] = useState("");
  const [newPriceOp, setNewPriceOp] = useState("+");
  const [newWeightOp, setNewWeightOp] = useState("+");
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkStock, setBulkStock] = useState("");

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/product-options", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          const published = (data.options || [])
            .filter((o) => o.status === "published")
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
          setProductOptions(published);
          setForm((f) => {
            const existing = Array.isArray(f.simpleVariations) ? f.simpleVariations : [];
            const next = [...existing];
            published.forEach((option) => {
              if (!next.some((v) => v.name === option.name)) {
                next.push({ name: option.name, enabled: false, tags: [] });
              }
            });
            return { ...f, simpleVariations: next };
          });
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchOptions();
  }, [setForm]);

  const enabledVariations = simpleVariations.filter((v) => v.enabled && v.tags?.length > 0);

  function getTotalCombinations(variations) {
    return variations.reduce((total, v) => total * (v.tags?.length || 1), 1);
  }

  function generateCartesian(variations) {
    if (variations.length === 0) return [];

    const result = [];
    function recurse(index, current) {
      if (index === variations.length) {
        result.push(current);
        return;
      }
      const variation = variations[index];
      for (const tag of variation.tags) {
        recurse(index + 1, [...current, { name: variation.name, value: tag }]);
      }
    }

    recurse(0, []);
    return result;
  }

  const updateVariation = (name, updates) => {
    const updated = simpleVariations.map((v) => (v.name === name ? { ...v, ...updates } : v));
    setForm((f) => ({ ...f, simpleVariations: updated }));
  };

  const toggleVariation = (name, checked) => {
    const existing = simpleVariations.find((v) => v.name === name);
    if (existing) {
      updateVariation(name, { enabled: checked });
    } else {
      setForm((f) => ({
        ...f,
        simpleVariations: [...(f.simpleVariations || []), { name, enabled: checked, tags: [] }],
      }));
    }
  };

  const addCombination = () => {
    const defaultStock = parseInt(String(form.inventory?.quantity ?? ""), 10) || 0;
    const basePrice = parseFloat(form.pricing?.regularPrice || 0);
    const baseWeight = parseFloat(form.shipping?.weight ?? form.inventory?.weight ?? 0);
    const priceDelta = (newPriceOp === "+" ? 1 : -1) * (parseFloat(newPrice || 0) || 0);
    const weightDelta = (newWeightOp === "+" ? 1 : -1) * (parseFloat(newWeight || 0) || 0);
    const finalPrice = basePrice + priceDelta;
    const finalWeight = baseWeight + weightDelta;
    const options = enabledVariations.map((v) => ({
      name: v.name,
      value: newCombo[v.name] || "",
    }));
    const combo = {
      options,
      priceDelta,
      weightDelta,
      price: finalPrice,
      weight: finalWeight,
      stock: newStock !== "" && newStock != null ? parseInt(String(newStock), 10) || 0 : defaultStock,
    };
    setForm((f) => ({
      ...f,
      variationCombinations: [...(f.variationCombinations || []), combo],
    }));
    setNewCombo({});
    setNewWeight("");
    setNewPrice("");
    setNewStock("");
    setNewPriceOp("+");
    setNewWeightOp("+");
    toast.success("Variation added!");
  };

  const generateAllCombinations = () => {
    const enabled = simpleVariations.filter((v) => v.enabled && v.tags?.length > 0);
    if (enabled.length === 0) return;

    const total = getTotalCombinations(enabled);
    if (total > 100) {
      const confirmed = window.confirm(`This will generate ${total} combinations. Are you sure?`);
      if (!confirmed) return;
    }

    const allOptions = generateCartesian(enabled);

    function combinationsMatch(comboOpts, generatedOpts) {
      const a = comboOpts || [];
      const b = generatedOpts || [];
      if (a.length !== b.length) return false;
      const hit = (x, y) =>
        x.every((existOpt) => y.some((newOpt) => newOpt.name === existOpt.name && newOpt.value === existOpt.value));
      return hit(a, b) && hit(b, a);
    }

    setForm((f) => {
      const prevCombos = f.variationCombinations || [];
      const defaultQty = parseInt(String(f.inventory?.quantity ?? ""), 10) || 0;
      const newCombos = allOptions.map((options) => {
        const existing = prevCombos.find((combo) => combinationsMatch(combo.options, options));

        return {
          options,
          priceDelta: existing?.priceDelta ?? 0,
          weightDelta: existing?.weightDelta ?? 0,
          price: existing?.price ?? parseFloat(f.pricing?.regularPrice || 0),
          weight: existing?.weight ?? parseFloat(f.shipping?.weight ?? f.inventory?.weight ?? 0),
          stock:
            existing?.stock !== undefined && existing?.stock !== null ? existing.stock : defaultQty,
        };
      });
      return { ...f, variationCombinations: newCombos };
    });

    toast.success(
      `Generated ${allOptions.length} combinations! Stock starts from default quantity — adjust per row as needed.`
    );
  };

  const updateCombo = (idx, field, value) => {
    const combos = [...(form.variationCombinations || [])];
    const next = { ...combos[idx], [field]: value };
    if (field === "price") {
      const basePrice = parseFloat(form.pricing?.regularPrice || 0);
      next.priceDelta = value - basePrice;
    }
    if (field === "weight") {
      const baseWeight = parseFloat(form.shipping?.weight ?? form.inventory?.weight ?? 0);
      next.weightDelta = value - baseWeight;
    }
    combos[idx] = next;
    setForm((f) => ({ ...f, variationCombinations: combos }));
  };

  const deleteCombo = (idx) => {
    const combos = (form.variationCombinations || []).filter((_, i) => i !== idx);
    setForm((f) => ({ ...f, variationCombinations: combos }));
  };

  const applyBulkValues = () => {
    const hasPrice = bulkPrice !== "" && !Number.isNaN(parseFloat(bulkPrice));
    const hasStock = bulkStock !== "" && !Number.isNaN(parseInt(bulkStock, 10));
    if (!hasPrice && !hasStock) return;

    const priceValue = parseFloat(bulkPrice) || 0;
    const stockValue = parseInt(bulkStock, 10) || 0;
    const basePrice = parseFloat(form.pricing?.regularPrice || 0);

    setForm((f) => ({
      ...f,
      variationCombinations: (f.variationCombinations || []).map((combo) => ({
        ...combo,
        price: hasPrice ? priceValue : combo.price,
        priceDelta: hasPrice ? priceValue - basePrice : combo.priceDelta ?? 0,
        stock: hasStock ? stockValue : combo.stock,
      })),
    }));
    toast.success("Bulk update applied!");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
        <h3
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "#111827",
            marginBottom: 16,
            paddingBottom: 10,
            borderBottom: "1px solid #f3f4f6",
          }}
        >
          Product Variations
        </h3>

        <div
          style={{
            background: "#f0fdf4",
            border: "2px solid #bbf7d0",
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "#166534", margin: "0 0 4px" }}>
            Default Variation Values
          </h3>
          <p style={{ fontSize: 13, color: "#16a34a", margin: "0 0 16px" }}>
            Set the base values. Each variation will add or subtract from these defaults.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#166534", marginBottom: 6 }}>
                Default Price (Rs.) *
              </label>
              <input
                type="number"
                value={form.pricing?.regularPrice || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    pricing: {
                      ...(f.pricing || {}),
                      regularPrice: parseFloat(e.target.value) || 0,
                    },
                  }))
                }
                placeholder="e.g. 1000"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  border: "2px solid #86efac",
                  borderRadius: 8,
                  fontSize: 14,
                  background: "#fff",
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
              <p style={{ fontSize: 11, color: "#16a34a", marginTop: 4 }}>Base price before variation adjustment</p>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#166534", marginBottom: 6 }}>
                Default Weight (g)
              </label>
              <input
                type="number"
                value={form.shipping?.weight ?? form.inventory?.weight ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    shipping: {
                      ...(f.shipping || {}),
                      weight: parseFloat(e.target.value) || 0,
                    },
                    inventory: {
                      ...(f.inventory || {}),
                      weight: parseFloat(e.target.value) || 0,
                    },
                  }))
                }
                placeholder="e.g. 50"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  border: "2px solid #86efac",
                  borderRadius: 8,
                  fontSize: 14,
                  background: "#fff",
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
              <p style={{ fontSize: 11, color: "#16a34a", marginTop: 4 }}>Base weight for shipping calculation</p>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#166534", marginBottom: 6 }}>
                Default Stock (qty)
              </label>
              <input
                type="number"
                value={form.inventory?.quantity || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    inventory: {
                      ...(f.inventory || {}),
                      quantity: parseInt(e.target.value, 10) || 0,
                    },
                  }))
                }
                placeholder="e.g. 100"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  border: "2px solid #86efac",
                  borderRadius: 8,
                  fontSize: 14,
                  background: "#fff",
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
              <p style={{ fontSize: 11, color: "#16a34a", margin: "4px 0 0" }}>
                This will be used as starting stock for each new variation generated. You can change each variation
                stock individually.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px 16px", marginBottom: 20 }}>
          {productOptions.length === 0 ? (
            <p style={{ color: "#9ca3af", fontSize: 13, gridColumn: "1 / -1" }}>
              No options found.
              <a href="/product-options/new" style={{ color: "#009688", marginLeft: 4 }}>
                Add product options first
              </a>
            </p>
          ) : (
            productOptions.map((option) => {
              const v = simpleVariations.find((x) => x.name === option.name);
              const checked = v?.enabled || false;
              return (
                <label
                  key={option.name}
                  style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => toggleVariation(option.name, e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: "#009688" }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>{option.name}</span>
                </label>
              );
            })
          )}
        </div>

        {simpleVariations
          .filter((v) => v.enabled)
          .map((v) => (
            <div key={v.name} style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>
                {v.name} values:
              </label>
              <TagInput
                value={v.tags || []}
                onChange={(tags) => updateVariation(v.name, { tags })}
                placeholder={`Add ${v.name} value and press Enter`}
              />
            </div>
          ))}

        {enabledVariations.length > 0 && enabledVariations.every((v) => v.tags?.length > 0) && (
          <div
            style={{
              marginTop: 16,
              padding: "12px 16px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 8,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#166534", margin: 0 }}>Auto-Generate Combinations</p>
              <p style={{ fontSize: 12, color: "#16a34a", margin: "2px 0 0" }}>
                {getTotalCombinations(enabledVariations)} combinations will be generated from your variation tags
              </p>
            </div>
            <button
              type="button"
              onClick={generateAllCombinations}
              style={{
                background: "#16a34a",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {"\u26A1"} Generate All Combinations
            </button>
          </div>
        )}
      </div>

      {enabledVariations.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#111827", margin: 0 }}>Add New Variation (Optional)</h3>
            <button
              type="button"
              onClick={() => setShowManualAdd((p) => !p)}
              style={{
                background: "none",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 13,
                color: "#374151",
                cursor: "pointer",
              }}
            >
              {showManualAdd ? "\u25B2 Hide" : "\u25BC Add Single Variation Manually"}
            </button>
          </div>

          {showManualAdd && (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 14, marginBottom: 12 }}>
                {enabledVariations.map((v) => (
                  <div key={v.name} style={{ flex: "1 1 150px" }}>
                    <label
                      style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#6b7280", marginBottom: 4 }}
                    >
                      {v.name}
                    </label>
                    <select
                      value={newCombo[v.name] || ""}
                      onChange={(e) => setNewCombo((p) => ({ ...p, [v.name]: e.target.value }))}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        fontSize: 13,
                        background: "#fff",
                        color: "#111827",
                      }}
                    >
                      <option value="">-- Select --</option>
                      {v.tags.map((tag) => (
                        <option key={tag} value={tag}>
                          {tag}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 120px" }}>
                  <label
                    style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#6b7280", marginBottom: 4 }}
                  >
                    Weight Difference (g)
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <select
                      value={newWeightOp || "+"}
                      onChange={(e) => setNewWeightOp(e.target.value)}
                      style={{
                        padding: "8px 10px",
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        fontSize: 14,
                        background: "#fff",
                      }}
                    >
                      <option value="+">+ Add</option>
                      <option value="-">- Subtract</option>
                    </select>
                    <input
                      type="number"
                      value={newWeight}
                      onChange={(e) => setNewWeight(e.target.value)}
                      placeholder="0"
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        fontSize: 14,
                      }}
                    />
                  </div>
                  {newWeight ? (
                    <p style={{ fontSize: 12, color: "#009688", marginTop: 4, fontWeight: 600 }}>
                      Final weight:{" "}
                      {(
                        parseFloat(form.shipping?.weight ?? form.inventory?.weight ?? 0) +
                        (newWeightOp === "+" ? 1 : -1) * parseFloat(newWeight || 0)
                      ).toFixed(1)}
                      g
                    </p>
                  ) : null}
                </div>
                <div style={{ flex: "1 1 120px" }}>
                  <label
                    style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#6b7280", marginBottom: 4 }}
                  >
                    Price Difference (Rs.)
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <select
                      value={newPriceOp || "+"}
                      onChange={(e) => setNewPriceOp(e.target.value)}
                      style={{
                        padding: "8px 10px",
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        fontSize: 14,
                        background: "#fff",
                      }}
                    >
                      <option value="+">+ Add</option>
                      <option value="-">- Subtract</option>
                    </select>
                    <input
                      type="number"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      placeholder="0"
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        fontSize: 14,
                      }}
                    />
                  </div>
                  {newPrice ? (
                    <p style={{ fontSize: 12, color: "#009688", marginTop: 4, fontWeight: 600 }}>
                      Final price:{" "}
                      {formatAdminPrice(
                        parseFloat(form.pricing?.regularPrice || 0) +
                          (newPriceOp === "+" ? 1 : -1) * parseFloat(newPrice || 0)
                      )}
                    </p>
                  ) : null}
                </div>
                <div style={{ flex: "1 1 120px" }}>
                  <label
                    style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#6b7280", marginBottom: 4 }}
                  >
                    Stock for this variation
                  </label>
                  <input
                    type="number"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    placeholder="Default stock if empty"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                  />
                  <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                    Leave blank to use default stock (qty above).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addCombination}
                  style={{
                    padding: "8px 20px",
                    background: "#16a34a",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  + Add Variation
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {(form.variationCombinations || []).length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
              paddingBottom: 10,
              borderBottom: "1px solid #f3f4f6",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#111827", margin: 0 }}>
              Variations
              <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 400, marginLeft: 8 }}>
                ({form.variationCombinations.length} combinations)
              </span>
            </h3>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "#6b7280" }}>Set all prices:</span>
              <input
                type="number"
                placeholder="Price"
                value={bulkPrice}
                onChange={(e) => setBulkPrice(e.target.value)}
                style={{
                  width: 80,
                  padding: "5px 8px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 6,
                  fontSize: 12,
                }}
              />
              <input
                type="number"
                placeholder="Stock"
                value={bulkStock}
                onChange={(e) => setBulkStock(e.target.value)}
                style={{
                  width: 70,
                  padding: "5px 8px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 6,
                  fontSize: 12,
                }}
              />
              <button
                type="button"
                onClick={applyBulkValues}
                style={{
                  padding: "5px 12px",
                  background: "#009688",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Apply to All
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Clear all combinations? This cannot be undone.")) {
                    setForm((f) => ({ ...f, variationCombinations: [] }));
                    toast.success("All combinations cleared.");
                  }
                }}
                style={{
                  padding: "5px 12px",
                  background: "#fee2e2",
                  color: "#dc2626",
                  border: "1px solid #fca5a5",
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Clear All
              </button>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {enabledVariations.map((v) => (
                    <th
                      key={v.name}
                      style={{
                        padding: "10px 12px",
                        textAlign: "left",
                        fontWeight: 600,
                        color: "#374151",
                        borderBottom: "1px solid #e5e7eb",
                        whiteSpace: "nowrap",
                        minWidth: 100,
                      }}
                    >
                      {v.name}
                    </th>
                  ))}
                  <th
                    style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#374151",
                      borderBottom: "1px solid #e5e7eb",
                      minWidth: 100,
                    }}
                  >
                    Price (Base + Δ)
                  </th>
                  <th
                    style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#374151",
                      borderBottom: "1px solid #e5e7eb",
                      minWidth: 80,
                    }}
                  >
                    Weight
                  </th>
                  <th
                    style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#374151",
                      borderBottom: "1px solid #e5e7eb",
                      minWidth: 80,
                    }}
                  >
                    Stock *
                  </th>
                  <th
                    style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#374151",
                      borderBottom: "1px solid #e5e7eb",
                      width: 60,
                    }}
                  >
                    Del
                  </th>
                </tr>
              </thead>
              <tbody>
                {(form.variationCombinations || []).map((combo, idx) => {
                  const missingStock = combo.stock === undefined || combo.stock === null;
                  const missingPrice = combo.price === undefined || combo.price === null || combo.price === "";
                  return (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: "1px solid #f3f4f6",
                        background: missingStock ? "#fffbeb" : "#fff",
                      }}
                    >
                    {enabledVariations.map((v) => {
                      const opt = combo.options?.find((o) => o.name === v.name);
                      return (
                        <td key={v.name} style={{ padding: "8px 12px", fontWeight: 500, color: "#374151" }}>
                          <span
                            style={{
                              background: "#f3f4f6",
                              padding: "3px 10px",
                              borderRadius: 99,
                              fontSize: 12,
                            }}
                          >
                            {opt?.value || "-"}
                          </span>
                        </td>
                      );
                    })}
                    <td style={{ padding: "8px 12px" }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                          {formatAdminPrice(combo.price || 0)}
                        </span>
                        {combo.priceDelta !== 0 ? (
                          <span
                            style={{
                              fontSize: 11,
                              color: combo.priceDelta > 0 ? "#16a34a" : "#ef4444",
                              display: "block",
                            }}
                          >
                            {combo.priceDelta > 0 ? "+" : ""}
                            {combo.priceDelta} from base
                          </span>
                        ) : null}
                      </div>
                      <input
                        type="number"
                        value={combo.price || ""}
                        placeholder="0"
                        onChange={(e) => updateCombo(idx, "price", parseFloat(e.target.value) || 0)}
                        style={{
                          width: 90,
                          padding: "4px 8px",
                          border: "1px solid",
                          borderColor: missingPrice ? "#fbbf24" : "#e5e7eb",
                          borderRadius: 6,
                          fontSize: 12,
                          marginTop: 4,
                          background: missingPrice ? "#fffbeb" : "#fff",
                        }}
                      />
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{combo.weight || 0}g</span>
                        {combo.weightDelta !== undefined && combo.weightDelta !== 0 ? (
                          <span
                            style={{
                              fontSize: 11,
                              color: combo.weightDelta > 0 ? "#16a34a" : "#ef4444",
                              display: "block",
                            }}
                          >
                            {combo.weightDelta > 0 ? "+" : ""}
                            {combo.weightDelta}g from base
                          </span>
                        ) : null}
                      </div>
                      <input
                        type="number"
                        value={combo.weight || ""}
                        placeholder="0"
                        onChange={(e) => updateCombo(idx, "weight", parseFloat(e.target.value) || 0)}
                        style={{
                          width: 90,
                          padding: "4px 8px",
                          border: "1px solid #e5e7eb",
                          borderRadius: 6,
                          fontSize: 12,
                          marginTop: 4,
                        }}
                      />
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <input
                        type="number"
                        min={0}
                        value={combo.stock ?? ""}
                        onChange={(e) => updateCombo(idx, "stock", parseInt(e.target.value, 10) || 0)}
                        placeholder="0"
                        style={{
                          width: 80,
                          padding: "4px 8px",
                          border: "1px solid",
                          borderColor: missingStock ? "#fbbf24" : "#e5e7eb",
                          borderRadius: 6,
                          fontSize: 13,
                          background: missingStock ? "#fffbeb" : "#fff",
                        }}
                      />
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <button
                        type="button"
                        onClick={() => deleteCombo(idx)}
                        style={{
                          padding: "5px 8px",
                          background: "#fee2e2",
                          color: "#dc2626",
                          border: "none",
                          borderRadius: 6,
                          fontSize: 14,
                          cursor: "pointer",
                        }}
                      >
                        {"\uD83D\uDDD1"}
                      </button>
                    </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div
            style={{
              marginTop: 12,
              padding: "8px 12px",
              background: "#f9fafb",
              borderRadius: 6,
              fontSize: 12,
              color: "#6b7280",
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <span>
              {"\u2705"} With price: {(form.variationCombinations || []).filter((c) => c.price > 0).length}
            </span>
            <span>
              {"\u2705"} With stock: {(form.variationCombinations || []).filter((c) => c.stock > 0).length}
            </span>
            <span style={{ color: "#f59e0b" }}>
              {"\u26A0\uFE0F"} Unset variation stock:{" "}
              {(form.variationCombinations || []).filter((c) => c.stock === undefined || c.stock === null).length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
