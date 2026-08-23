/**
 * Freeform order tags editor (OR5).
 */
"use client";

import { useState } from "react";
import toast from "react-hot-toast";

const SUGGESTED = ["needs-callback", "wrong-address", "repeat-customer", "gift-wrap", "priority"];

export function OrderTagsEditor({ order, onUpdated }) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const tags = Array.isArray(order?.tags) ? order.tags : [];

  async function save(next) {
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: next }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Could not update tags.");
        return;
      }
      onUpdated?.(json.order);
      toast.success("Tags updated.");
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  function addTag(raw) {
    const t = String(raw || "").trim().toLowerCase().slice(0, 40);
    if (!t) return;
    if (tags.includes(t)) {
      toast.error("Tag already on this order.");
      return;
    }
    setDraft("");
    save([...tags, t]);
  }

  function removeTag(t) {
    save(tags.filter((x) => x !== t));
  }

  return (
    <div
      className="rounded-xl border p-4 shadow-none"
      style={{ background: "var(--bg-panel)", borderColor: "var(--border-hairline)" }}
    >
      <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        Tags
      </h2>
      <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
        Freeform ops labels — filterable on the orders list.
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {tags.length === 0 ? (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            No tags yet.
          </span>
        ) : (
          tags.map((t) => (
            <button
              key={t}
              type="button"
              disabled={saving}
              onClick={() => removeTag(t)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold"
              style={{
                background: "color-mix(in srgb, var(--accent-money) 14%, transparent)",
                color: "var(--accent-money)",
              }}
              title="Click to remove"
            >
              {t} <span aria-hidden>×</span>
            </button>
          ))
        )}
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          addTag(draft);
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a tag…"
          className="min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-sm outline-none"
          style={{
            background: "var(--bg-base)",
            borderColor: "var(--border-hairline)",
            color: "var(--text-primary)",
          }}
        />
        <button
          type="submit"
          disabled={saving || !draft.trim()}
          className="rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
          style={{ background: "var(--accent-line)" }}
        >
          Add
        </button>
      </form>

      <div className="mt-2 flex flex-wrap gap-1">
        {SUGGESTED.filter((s) => !tags.includes(s)).map((s) => (
          <button
            key={s}
            type="button"
            disabled={saving}
            onClick={() => addTag(s)}
            className="rounded-md border px-2 py-0.5 text-[10px] font-medium"
            style={{ borderColor: "var(--border-hairline)", color: "var(--text-muted)" }}
          >
            + {s}
          </button>
        ))}
      </div>
    </div>
  );
}
