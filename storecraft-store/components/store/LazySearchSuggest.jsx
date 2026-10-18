"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Plain search input until focus/pointer — then load SearchSuggest open/panel logic.
 * Keeps First Load JS smaller while preserving Enter-to-search and keyboard use.
 */
export function LazySearchSuggest(props) {
  const [Comp, setComp] = useState(null);
  const [resumeFocus, setResumeFocus] = useState(false);
  const loadingRef = useRef(false);

  const load = useCallback(() => {
    if (Comp || loadingRef.current) return;
    loadingRef.current = true;
    import("@/components/store/SearchSuggest")
      .then((m) => {
        setComp(() => m.SearchSuggest);
        setResumeFocus(true);
      })
      .catch(() => {
        loadingRef.current = false;
      });
  }, [Comp]);

  if (Comp) {
    return <Comp {...props} autoFocus={props.autoFocus || resumeFocus} />;
  }

  return (
    <input
      type="search"
      value={props.value == null ? "" : String(props.value)}
      onChange={(e) => props.onChange?.(e.target.value)}
      onFocus={load}
      onPointerDown={load}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          load();
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          props.onSubmit?.(String(props.value || "").trim());
        }
      }}
      placeholder={props.placeholder}
      className={props.inputClassName}
      style={props.inputStyle}
      autoFocus={props.autoFocus}
      autoComplete="off"
      enterKeyHint="search"
      aria-autocomplete="list"
      aria-label={props.placeholder || "Search"}
    />
  );
}
