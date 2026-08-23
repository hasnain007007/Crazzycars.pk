/**
 * Internal-only note composer. Notes appear in the unified Activity feed (OR4).
 */
"use client";

import { useState } from "react";
import toast from "react-hot-toast";

export function InternalNotes({ order, onUpdated }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const noteCount = Array.isArray(order?.internalNotes) ? order.internalNotes.length : 0;

  async function add(e) {
    e.preventDefault();
    const note = text.trim();
    if (!note) {
      toast.error("Enter a note.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internalNote: { note } }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Could not add note.");
        return;
      }
      toast.success("Note added.");
      setText("");
      onUpdated(json.order);
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="rounded-xl border p-4 shadow-none"
      style={{ background: "var(--bg-panel)", borderColor: "var(--border-hairline)" }}
    >
      <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        Add internal note
      </h2>
      <p className="mt-0.5 text-xs" style={{ color: "var(--accent-attention)" }}>
        Not visible to the customer
        {noteCount > 0 ? ` · ${noteCount} in Activity below` : ""}.
      </p>
      <form onSubmit={add} className="mt-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Ops note…"
          className="w-full rounded-lg border px-2 py-2 text-sm"
          style={{
            background: "var(--bg-base)",
            borderColor: "var(--border-hairline)",
            color: "var(--text-primary)",
          }}
        />
        <button
          type="submit"
          disabled={saving}
          className="mt-2 rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--accent-line)" }}
        >
          {saving ? "Saving…" : "Add note"}
        </button>
      </form>
    </div>
  );
}
