"use client";

import { useCallback, useEffect, useState } from "react";

export default function ProductVariations({
  simpleVariations = [],
  variationCombinations = [],
  basePrice,
  onVariationChange,
}) {
  const [selected, setSelected] = useState({});
  const [currentPrice, setCurrentPrice] = useState(basePrice);

  const enabledVariations = simpleVariations.filter((v) => v.enabled && v.tags?.length > 0);

  const checkIfOutOfStock = useCallback(
    (variationName, tag) => {
      if (!variationCombinations.length) return false;

      return !variationCombinations.some((combo) => {
        const opts = combo.options || [];
        const hasThisTag = opts.some((o) => o.name === variationName && o.value === tag);
        if (!hasThisTag) return false;

        const matchesSelections = opts.every((o) => {
          if (o.name === variationName) return o.value === tag;
          const sel = selected[o.name];
          if (!sel) return true;
          return sel === o.value;
        });

        return matchesSelections && Number(combo.stock) > 0;
      });
    },
    [variationCombinations, selected]
  );

  const handleVariationChange = (variationName, value) => {
    setSelected((prev) => ({
      ...prev,
      [variationName]: value,
    }));
  };

  useEffect(() => {
    const allSelected = enabledVariations.every((v) => selected[v.name]);
    if (allSelected && variationCombinations.length > 0) {
      const match = variationCombinations.find((combo) =>
        (combo.options || []).every((opt) => selected[opt.name] === opt.value)
      );
      const finalPrice = Number(match?.price);
      setCurrentPrice(Number.isFinite(finalPrice) ? finalPrice : basePrice);
      onVariationChange?.(selected, match || null);
    } else {
      setCurrentPrice(basePrice);
      onVariationChange?.(selected, null);
    }
  }, [selected, enabledVariations, variationCombinations, basePrice, onVariationChange]);

  if (enabledVariations.length === 0) return null;

  return (
    <div style={{ margin: "16px 0" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "12px 16px",
          marginBottom: 8,
        }}
      >
        {enabledVariations.map((variation) => (
          <div key={variation.name}>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 700,
              color: "#111111",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 8,
            }}
          >
            {variation.name}
          </label>

          <select
            value={selected[variation.name] || ""}
            onChange={(e) => handleVariationChange(variation.name, e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "1.5px solid #E5E5E5",
              borderRadius: 6,
              fontSize: 14,
              color: "#111111",
              background: "#FFFFFF",
              cursor: "pointer",
              outline: "none",
              appearance: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23111111' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 12px center",
              paddingRight: 36,
              fontFamily: "inherit",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#111111";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#E5E5E5";
            }}
          >
            <option value="">Select {variation.name}</option>
            {variation.tags.map((tag) => {
              const isOutOfStock = checkIfOutOfStock(variation.name, tag);
              return (
                <option key={tag} value={tag} disabled={isOutOfStock}>
                  {tag}
                  {isOutOfStock ? " - Out of Stock" : ""}
                </option>
              );
            })}
          </select>
          </div>
        ))}
      </div>
      <input type="hidden" value={currentPrice || basePrice || 0} readOnly />
    </div>
  );
}
