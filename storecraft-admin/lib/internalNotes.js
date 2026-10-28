/**
 * Normalize Order.internalNotes to an array of { note, addedBy, addedAt }.
 * Migration recovery stored a plain string on ~188 docs; UI/API expect an array.
 */
export function normalizeInternalNotes(raw, { addedBy = "system", addedAt = null } = {}) {
  if (Array.isArray(raw)) return raw;
  if (raw == null || raw === "") return [];
  if (typeof raw === "string") {
    const note = raw.trim();
    if (!note) return [];
    return [
      {
        note: note.slice(0, 5000),
        addedBy,
        addedAt: addedAt ? new Date(addedAt) : new Date(),
      },
    ];
  }
  if (typeof raw === "object" && (raw.note || raw.text)) {
    return [
      {
        note: String(raw.note || raw.text || "").slice(0, 5000),
        addedBy: raw.addedBy || addedBy,
        addedAt: raw.addedAt ? new Date(raw.addedAt) : new Date(),
      },
    ];
  }
  return [];
}

export function ensureInternalNotesArray(order) {
  if (!order) return [];
  if (!Array.isArray(order.internalNotes)) {
    order.internalNotes = normalizeInternalNotes(order.internalNotes);
  }
  return order.internalNotes;
}
