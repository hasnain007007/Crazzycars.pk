/**
 * Reusable chip/tag input: Enter or comma adds tags; Backspace removes last when input empty.
 */
"use client";

import { useCallback, useMemo, useRef, useState } from "react";

export function TagInput({ value, onChange, placeholder }) {
  const tags = useMemo(() => (Array.isArray(value) ? value : []), [value]);
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);

  const pushUnique = useCallback(
    (parts) => {
      const next = [...tags];
      for (const p of parts) {
        if (p && !next.includes(p)) next.push(p);
      }
      onChange(next);
    },
    [tags, onChange]
  );

  const flushDraft = useCallback(() => {
    const t = draft.trim();
    if (!t) return;
    const parts = t
      .split(/[,]+|\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length) pushUnique(parts);
    setDraft("");
  }, [draft, pushUnique]);

  const addFromDelimited = useCallback(
    (raw) => {
      const parts = String(raw)
        .split(/[,]+|\n+/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (parts.length) pushUnique(parts);
      setDraft("");
    },
    [pushUnique]
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      flushDraft();
      return;
    }
    if (e.key === ",") {
      e.preventDefault();
      if (draft.trim()) {
        pushUnique([draft.trim()]);
        setDraft("");
      }
      return;
    }
    if (e.key === "Backspace" && !draft && tags.length > 0) {
      e.preventDefault();
      onChange(tags.slice(0, -1));
    }
  };

  const handlePaste = (e) => {
    const text = e.clipboardData?.getData("text/plain") || "";
    if (text.includes(",") || text.includes("\n")) {
      e.preventDefault();
      addFromDelimited(text);
    }
  };

  const remove = (index) => {
    onChange(tags.filter((_, i) => i !== index));
    inputRef.current?.focus();
  };

  return (
    <div
      className="flex min-h-[42px] flex-wrap items-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-2 py-1.5 focus-within:ring-2 focus-within:ring-[#1d6fb8]/25"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag, i) => (
        <span
          key={`${tag}-${i}`}
          className="inline-flex max-w-full items-center gap-1 rounded-full bg-[#eff6ff] py-0.5 pl-2.5 pr-1 text-sm font-medium text-[#1d4ed8]"
        >
          <span className="truncate">{tag}</span>
          <button
            type="button"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#1d4ed8] hover:bg-blue-100"
            onClick={(ev) => {
              ev.stopPropagation();
              remove(i);
            }}
            aria-label={`Remove ${tag}`}
          >
            <span className="text-base leading-none">×</span>
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="min-w-[120px] flex-1 border-0 bg-transparent py-1 text-sm text-[#111827] outline-none placeholder:text-[#9ca3af]"
        placeholder={tags.length ? "" : placeholder}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        aria-label={placeholder || "Add tags"}
      />
    </div>
  );
}
