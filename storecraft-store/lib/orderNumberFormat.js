/**
 * Shared order number formatting (no DB). Used by Settings preview and allocateOrderNumber.
 * Year/month use UTC to match historical ORD-YYYY behavior.
 */

export function defaultOrderNumberConfig() {
  return {
    prefix: "ORD",
    separator: "-",
    includeYear: true,
    includeMonth: false,
    startingNumber: 1,
    currentSequence: 0,
  };
}

export function normalizeOrderNumberConfig(input) {
  const d = defaultOrderNumberConfig();
  if (!input || typeof input !== "object") return { ...d };
  const sep = input.separator === undefined || input.separator === null ? d.separator : String(input.separator);
  const sn = parseInt(input.startingNumber, 10);
  const cs = parseInt(input.currentSequence, 10);
  return {
    prefix: String(input.prefix ?? d.prefix).trim() || d.prefix,
    separator: sep,
    includeYear: input.includeYear !== undefined ? Boolean(input.includeYear) : d.includeYear,
    includeMonth: input.includeMonth !== undefined ? Boolean(input.includeMonth) : d.includeMonth,
    startingNumber: Number.isFinite(sn) && sn >= 1 ? sn : d.startingNumber,
    currentSequence: Number.isFinite(cs) && cs >= 0 ? cs : d.currentSequence,
  };
}

/**
 * @param {object} config - orderNumber settings (partial ok)
 * @param {number} sequence - allocated sequence (integer, will be zero-padded to 5 digits)
 * @param {Date} [date]
 */
export function formatOrderNumber(config, sequence, date = new Date()) {
  const c = normalizeOrderNumberConfig(config);
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  const seq = Math.max(0, Math.floor(Number(sequence)) || 0);
  const pad = String(seq).padStart(5, "0");
  const sep = c.separator;
  const year = String(d.getUTCFullYear());
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const parts = [c.prefix || "ORD"];
  if (c.includeYear) parts.push(year);
  if (c.includeMonth) parts.push(month);
  parts.push(pad);
  return parts.join(sep);
}

/** Next sequence after increment (for preview only). */
export function previewNextSequence(config) {
  const c = normalizeOrderNumberConfig(config);
  return Math.max(c.currentSequence + 1, c.startingNumber);
}
