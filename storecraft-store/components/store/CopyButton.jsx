"use client";

import { useState } from "react";

/** Small "Copy" button for account numbers / IBANs. */
export default function CopyButton({ value, label = "Copy" }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="adv-copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(String(value || ""));
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          /* clipboard blocked: number is still selectable */
        }
      }}
      aria-label={`${label} ${value}`}
    >
      {done ? "Copied" : label}
    </button>
  );
}
