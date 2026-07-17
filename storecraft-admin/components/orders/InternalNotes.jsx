/**
 * Internal-only notes timeline + add form.
 */
"use client";

import { useState } from "react";
import toast from "react-hot-toast";

function initials(name) {
  const parts = String(name || "A").trim().split(/\s+/);
  const a = parts[0]?.[0] || "A";
  const b = parts[1]?.[0] || "";
  return (a + b).toUpperCase();
}

function formatWhen(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "—";
  }
}

export function InternalNotes({ order, onUpdated }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const notes = [...(order.internalNotes || [])].sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));

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
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Internal notes</h2>
      <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300/90">Not visible to the customer.</p>
      <ul className="mt-4 max-h-72 space-y-4 overflow-y-auto">
        {notes.length === 0 ? (
          <li className="text-sm text-slate-500 dark:text-slate-400">No notes yet.</li>
        ) : (
          notes.map((n) => (
            <li key={n.id} className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                {initials(n.addedBy)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-medium text-slate-800 dark:text-slate-200">{n.addedBy}</span>
                  {" · "}
                  {formatWhen(n.addedAt)}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{n.note}</p>
              </div>
            </li>
          ))
        )}
      </ul>
      <form onSubmit={add} className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Add note</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
        />
        <button
          type="submit"
          disabled={saving}
          className="mt-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50 dark:bg-slate-600 dark:hover:bg-slate-500"
        >
          {saving ? "Saving…" : "Add note"}
        </button>
      </form>
    </div>
  );
}
