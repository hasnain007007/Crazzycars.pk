/**
 * Match settlement lines to Orders by tracking CN (PostEx digits + Run Courier GW…)
 * or order reference / order number; compute COGS + line profit.
 */
import Order from "@/lib/models/Order.model";
import Product from "@/lib/models/Product.model";

/** Digits only — PostEx CN style. */
export function normalizeTrackingDigits(raw) {
  return String(raw || "").replace(/\D/g, "");
}

/** Alphanumeric compact uppercase — Run Courier GW… style. */
export function compactTracking(raw) {
  return String(raw || "")
    .trim()
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

/** @deprecated use normalizeTrackingDigits — kept for callers */
export function normalizeTracking(raw) {
  return normalizeTrackingDigits(raw);
}

/**
 * All lookup keys for a tracking token (digit + compact).
 * @returns {string[]}
 */
export function trackingLookupKeys(raw) {
  const keys = new Set();
  const compact = compactTracking(raw);
  const digits = normalizeTrackingDigits(raw);
  if (compact) keys.add(compact);
  if (digits) keys.add(digits);
  return [...keys];
}

/**
 * PostEx ORDER_REF_NUMBER is the shop order number (e.g. ORD-2026-00136 or #CC.PK2080).
 * Expand variants for DB lookup.
 * @returns {string[]}
 */
export function orderNumberLookupKeys(raw) {
  const keys = new Set();
  let s = String(raw || "")
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/^#+/, "")
    .trim();
  if (!s) return [];

  const upper = s.toUpperCase();
  keys.add(upper);
  keys.add(upper.replace(/\s+/g, ""));

  // ORD-2026-00136 / ORD202600136 / ORD-2026-136
  const ord = upper.match(/ORD-?\s*(\d{4})-?\s*(\d{1,6})/);
  if (ord) {
    const year = ord[1];
    const seq = ord[2].padStart(5, "0");
    keys.add(`ORD-${year}-${seq}`);
    keys.add(`ORD-${year}-${ord[2]}`);
    keys.add(`ORD${year}${seq}`);
  }

  // #CC.PK2080 / CC.PK2080 / CCPK2080
  const pk = upper.match(/^([A-Z]{1,4})\.?PK\.?(\d+)$/);
  if (pk) {
    keys.add(`${pk[1]}.PK${pk[2]}`);
    keys.add(`${pk[1]}PK${pk[2]}`);
    keys.add(`#${pk[1]}.PK${pk[2]}`);
  }

  return [...keys].filter((k) => k.length >= 3);
}

/** Best display form of a sheet order ref. */
export function displayOrderRef(raw) {
  const keys = orderNumberLookupKeys(raw);
  const ord = keys.find((k) => /^ORD-\d{4}-\d+$/.test(k));
  if (ord) return ord;
  const cleaned = String(raw || "")
    .trim()
    .replace(/^#+/, "")
    .trim();
  return cleaned || "";
}

/**
 * Build tracking → order ref map from spreadsheet (or any) lines.
 * @param {Array<{ trackingNumber?: string, orderNumberHint?: string, sheetOrderNumber?: string, orderNumber?: string }>} lines
 * @returns {Map<string, string>}
 */
export function buildOrderRefMapFromLines(lines) {
  const map = new Map();
  for (const line of lines || []) {
    const ref = displayOrderRef(
      line.orderNumberHint || line.sheetOrderNumber || line.orderNumber || ""
    );
    if (!ref) continue;
    for (const k of trackingLookupKeys(line.trackingNumber)) {
      if (!map.has(k)) map.set(k, ref);
    }
  }
  return map;
}

/**
 * Copy ORDER_REF / Order ID onto lines missing an order hint (e.g. CPR PDF + CSV).
 * @param {object[]} lines
 * @param {Map<string, string>|Record<string, string>} refMap
 */
export function mergeOrderRefsByTracking(lines, refMap) {
  const map =
    refMap instanceof Map
      ? refMap
      : new Map(Object.entries(refMap || {}));
  if (!map.size) return lines || [];
  return (lines || []).map((line) => {
    const existing = displayOrderRef(
      line.orderNumberHint || line.sheetOrderNumber || line.orderNumber || ""
    );
    if (existing) {
      return {
        ...line,
        orderNumberHint: existing,
        sheetOrderNumber: existing,
      };
    }
    let ref = "";
    for (const k of trackingLookupKeys(line.trackingNumber)) {
      if (map.has(k)) {
        ref = map.get(k);
        break;
      }
    }
    if (!ref) return line;
    return {
      ...line,
      orderNumberHint: ref,
      sheetOrderNumber: ref,
    };
  });
}

/**
 * Batch-level COGS / return fees / profit from enriched lines + optional CPR net.
 */
export function computeSettlementProfitTotals(enriched, batchNetTotal = null) {
  const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const matchedDelivered = (enriched || []).filter(
    (l) =>
      l.status === "Delivered" &&
      (l.matchStatus === "matched" || l.matchStatus === "manual")
  );
  const productCogsTotal = round2(
    matchedDelivered.reduce((s, l) => s + (Number(l.productCogs) || 0), 0)
  );
  const matchedLineProfit = round2(
    matchedDelivered.reduce((s, l) => s + (Number(l.lineProfit) || 0), 0)
  );
  const returnFeesTotal = round2(
    (enriched || [])
      .filter((l) => l.status === "Return")
      .reduce((s, l) => {
        const net = Number(l.netAmount) || 0;
        if (net < 0) return s + Math.abs(net);
        return s + (Number(l.shippingCharges) || 0) + (Number(l.gst) || 0);
      }, 0)
  );
  const net =
    batchNetTotal != null && Number.isFinite(Number(batchNetTotal))
      ? Number(batchNetTotal)
      : round2(
          matchedDelivered.reduce((s, l) => s + (Number(l.netAmount) || 0), 0)
        );
  // Authoritative: CPR net (already nets return fees) − matched product cost
  const profitTotal = round2(net - productCogsTotal);
  return {
    productCogsTotal,
    returnFeesTotal,
    matchedLineProfit,
    profitTotal,
  };
}

export async function computeOrderCogs(order, costByProduct = null) {
  let map = costByProduct;
  if (!map) {
    const ids = (order?.items || [])
      .map((it) => (it?.productId ? String(it.productId) : ""))
      .filter(Boolean);
    map = new Map();
    if (ids.length) {
      const products = await Product.find({ _id: { $in: ids } })
        .select("pricing.costPerItem")
        .lean();
      for (const p of products) {
        map.set(String(p._id), Number(p.pricing?.costPerItem) || 0);
      }
    }
  }
  let cost = 0;
  for (const it of order?.items || []) {
    const qty = Math.max(1, Number(it.quantity) || 1);
    let unitCost = Number(it.unitCost);
    if (!Number.isFinite(unitCost) || unitCost <= 0) {
      unitCost = it.productId ? map.get(String(it.productId)) || 0 : 0;
    }
    cost += Math.max(0, unitCost) * qty;
  }
  return Math.round(cost * 100) / 100;
}

/**
 * Find orders for a list of tracking numbers (PostEx + GW).
 * Map keys are every lookup key that resolved to that order.
 * @returns {Map<string, object>}
 */
export async function findOrdersByTracking(trackingNumbers) {
  const map = new Map();
  const compactSet = new Set();
  const digitSet = new Set();
  for (const tn of trackingNumbers || []) {
    for (const k of trackingLookupKeys(tn)) {
      if (/^\d+$/.test(k)) digitSet.add(k);
      else compactSet.add(k);
    }
  }
  if (!compactSet.size && !digitSet.size) return map;

  const or = [];
  const compactList = [...compactSet];
  const digitList = [...digitSet];
  if (compactList.length) {
    or.push({ trackingNumber: { $in: compactList } });
    or.push({ "tracking.number": { $in: compactList } });
    // Case variants stored lowercase
    or.push({ trackingNumber: { $in: compactList.map((s) => s.toLowerCase()) } });
    or.push({ "tracking.number": { $in: compactList.map((s) => s.toLowerCase()) } });
  }
  if (digitList.length) {
    or.push({ trackingNumber: { $in: digitList } });
    or.push({ "tracking.number": { $in: digitList } });
    // Regex suffix for "GW" + digits stored as full CN when query is digits-only
    for (const d of digitList) {
      if (d.length >= 8) {
        or.push({ trackingNumber: new RegExp(`${d}$`, "i") });
        or.push({ "tracking.number": new RegExp(`${d}$`, "i") });
      }
    }
  }

  const orders = await Order.find({ $or: or })
    .select(
      "orderNumber trackingNumber tracking.number items.productId items.quantity items.unitCost paymentStatus paymentMethod pricing.total"
    )
    .lean();

  for (const o of orders) {
    const keys = [
      ...trackingLookupKeys(o.trackingNumber),
      ...trackingLookupKeys(o.tracking?.number),
    ];
    for (const k of keys) {
      if (!map.has(k)) map.set(k, o);
    }
  }
  return map;
}

/**
 * Find orders by PostEx ORDER_REF_NUMBER / printed order number.
 * @returns {Map<string, object>} keyed by every lookup variant that hit
 */
export async function findOrdersByOrderNumbers(orderNumbers) {
  const map = new Map();
  const nums = new Set();
  for (const raw of orderNumbers || []) {
    for (const k of orderNumberLookupKeys(raw)) nums.add(k);
  }
  if (!nums.size) return map;

  const list = [...nums];
  const orders = await Order.find({
    orderNumber: { $in: list },
  })
    .select(
      "orderNumber trackingNumber tracking.number items.productId items.quantity items.unitCost paymentStatus paymentMethod pricing.total"
    )
    .lean();

  for (const o of orders) {
    const stored = String(o.orderNumber || "").trim().toUpperCase();
    for (const k of orderNumberLookupKeys(stored)) {
      if (!map.has(k)) map.set(k, o);
    }
    if (stored && !map.has(stored)) map.set(stored, o);
  }
  return map;
}

function resolveOrderFromMaps(line, orderByTracking, orderByNumber) {
  for (const k of trackingLookupKeys(line.trackingNumber)) {
    const hit = orderByTracking.get(k);
    if (hit) return hit;
  }
  const hint = line.orderNumberHint || line.sheetOrderNumber || "";
  for (const k of orderNumberLookupKeys(hint)) {
    const hit = orderByNumber.get(k);
    if (hit) return hit;
  }
  return null;
}

export async function enrichLinesWithMatches(lines) {
  const orderByTracking = await findOrdersByTracking(lines.map((l) => l.trackingNumber));
  const orderByNumber = await findOrdersByOrderNumbers(
    lines.map((l) => l.orderNumberHint || l.sheetOrderNumber || "")
  );

  const productIds = new Set();
  for (const o of [...orderByTracking.values(), ...orderByNumber.values()]) {
    for (const it of o.items || []) {
      if (it?.productId) productIds.add(String(it.productId));
    }
  }
  const costByProduct = new Map();
  if (productIds.size) {
    const products = await Product.find({ _id: { $in: [...productIds] } })
      .select("pricing.costPerItem")
      .lean();
    for (const p of products) {
      costByProduct.set(String(p._id), Number(p.pricing?.costPerItem) || 0);
    }
  }

  const out = [];
  for (const line of lines) {
    const order = resolveOrderFromMaps(line, orderByTracking, orderByNumber);
    let productCogs = 0;
    let matchStatus = "unmatched";
    let orderId = null;
    const sheetRef = displayOrderRef(line.orderNumberHint || line.sheetOrderNumber || "");
    let orderNumber = sheetRef;
    if (order) {
      matchStatus = "matched";
      orderId = order._id;
      orderNumber = order.orderNumber || sheetRef;
      productCogs = await computeOrderCogs(order, costByProduct);
    }
    const net = Number(line.netAmount) || 0;
    const lineProfit =
      line.status === "Delivered" ? Math.round((net - productCogs) * 100) / 100 : 0;
    // Preserve original CN form (GW…) — prefer compact alphanumeric over digits-only
    const compact = compactTracking(line.trackingNumber);
    const storedTn = compact || String(line.trackingNumber || "").trim();
    out.push({
      ...line,
      trackingNumber: storedTn,
      orderId,
      orderNumber,
      matchStatus,
      productCogs,
      lineProfit,
      returnReceivedStatus:
        line.status === "Return" ? line.returnReceivedStatus || "pending" : "pending",
    });
  }
  return out;
}
