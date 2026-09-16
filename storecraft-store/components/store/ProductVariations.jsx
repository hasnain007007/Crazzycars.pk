"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  formatVariationName,
  isSwatchVariation,
  resolveSwatchHex,
  swatchNeedsRing,
  variationTagLabel,
} from "@/lib/colorSwatch";

export default function ProductVariations({
  simpleVariations = [],
  variationCombinations = [],
  basePrice,
  onVariationChange,
}) {
  const [selected, setSelected] = useState({});
  const [currentPrice, setCurrentPrice] = useState(basePrice);
  const onChangeRef = useRef(onVariationChange);
  const didAutoPick = useRef(false);
  useEffect(() => {
    onChangeRef.current = onVariationChange;
  }, [onVariationChange]);

  const enabledVariations = useMemo(
    () => (simpleVariations || []).filter((v) => v.enabled && v.tags?.length > 0),
    [simpleVariations]
  );
  /** Axes with only one option are auto-selected — don't show a useless "Style: Neon LED" picker. */
  const choiceVariations = useMemo(
    () =>
      enabledVariations.filter((v) => (v.tags || []).map(variationTagLabel).filter(Boolean).length > 1),
    [enabledVariations]
  );

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
    if (didAutoPick.current || enabledVariations.length === 0) return;
    const fromStock = (variationCombinations || []).find((combo) => Number(combo.stock) > 0);
    const next = {};
    if (fromStock) {
      for (const opt of fromStock.options || []) {
        if (enabledVariations.some((v) => v.name === opt.name) && opt.value) {
          next[opt.name] = opt.value;
        }
      }
    }
    for (const v of enabledVariations) {
      if (next[v.name]) continue;
      const first = (v.tags || []).map(variationTagLabel).find((tag) => tag && !checkIfOutOfStock(v.name, tag));
      if (first) next[v.name] = first;
    }
    if (Object.keys(next).length === 0) return;
    didAutoPick.current = true;
    setSelected((prev) => ({ ...next, ...prev }));
  }, [enabledVariations, variationCombinations, checkIfOutOfStock]);

  useEffect(() => {
    const allSelected =
      enabledVariations.length > 0 && enabledVariations.every((v) => selected[v.name]);
    if (allSelected && variationCombinations.length > 0) {
      const match = variationCombinations.find((combo) =>
        (combo.options || []).every((opt) => selected[opt.name] === opt.value)
      );
      const finalPrice = Number(match?.price);
      setCurrentPrice(Number.isFinite(finalPrice) ? finalPrice : basePrice);
      onChangeRef.current?.(selected, match || null);
    } else {
      setCurrentPrice(basePrice);
      onChangeRef.current?.(selected, null);
    }
  }, [selected, enabledVariations, variationCombinations, basePrice]);

  if (enabledVariations.length === 0) return null;
  if (choiceVariations.length === 0) {
    // Still run selection/price effects above; nothing for the shopper to choose.
    return <input type="hidden" value={currentPrice || basePrice || 0} readOnly />;
  }

  return (
    <div className="pdp-vars">
      {choiceVariations.map((variation) => {
        const tags = (variation.tags || []).map(variationTagLabel).filter(Boolean);
        const current = selected[variation.name] || "";
        const isSwatch = isSwatchVariation(variation.name, variation.tags);

        return (
          <div key={variation.name} className="pdp-var">
            <p className="pdp-var__label">
              {formatVariationName(variation.name)}: {current || "Select"}
            </p>
            {isSwatch ? (
              <div className="pdp-swatches" role="listbox" aria-label={variation.name}>
                {tags.map((tag) => {
                  const hex = resolveSwatchHex(tag);
                  const on = current === tag;
                  const oos = checkIfOutOfStock(variation.name, tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      role="option"
                      aria-selected={on}
                      aria-label={tag}
                      disabled={oos}
                      title={oos ? `${tag} — out of stock` : tag}
                      className={`pdp-swatch${on ? " is-on" : ""}${oos ? " is-oos" : ""}${
                        swatchNeedsRing(hex) ? " is-light" : ""
                      }`}
                      style={{ background: hex }}
                      onClick={() => handleVariationChange(variation.name, tag)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="pdp-pills" role="listbox" aria-label={variation.name}>
                {tags.map((tag) => {
                  const on = current === tag;
                  const oos = checkIfOutOfStock(variation.name, tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      role="option"
                      aria-selected={on}
                      disabled={oos}
                      className={`pdp-pill${on ? " is-on" : ""}${oos ? " is-oos" : ""}`}
                      onClick={() => handleVariationChange(variation.name, tag)}
                    >
                      {tag}
                      {oos ? " — Out of stock" : ""}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      <input type="hidden" value={currentPrice || basePrice || 0} readOnly />
    </div>
  );
}
