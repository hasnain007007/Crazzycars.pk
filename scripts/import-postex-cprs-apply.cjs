/**
 * Apply parsed PostEx CPR payload into Mongo (draft settlements + match orders).
 * Run inside storecraft-admin container:
 *   node /tmp/import-postex-cprs-apply.cjs /tmp/postex-cpr-import.json
 */
const fs = require("fs");
const mongoose = require("mongoose");

const payloadPath = process.argv[2] || "/tmp/postex-cpr-import.json";

function compactTracking(raw) {
  return String(raw || "")
    .trim()
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}
function digits(raw) {
  return String(raw || "").replace(/\D/g, "");
}
function trackingKeys(raw) {
  const keys = new Set();
  const c = compactTracking(raw);
  const d = digits(raw);
  if (c) keys.add(c);
  if (d) keys.add(d);
  return [...keys];
}
function orderKeys(raw) {
  const keys = new Set();
  let s = String(raw || "")
    .trim()
    .replace(/^#+/, "")
    .trim()
    .toUpperCase();
  if (!s) return [];
  keys.add(s);
  keys.add(s.replace(/\s+/g, ""));
  const ord = s.match(/ORD-?\s*(\d{4})-?\s*(\d{1,6})/);
  if (ord) {
    keys.add(`ORD-${ord[1]}-${ord[2].padStart(5, "0")}`);
    keys.add(`ORD-${ord[1]}-${ord[2]}`);
  }
  const pk = s.match(/^([A-Z]{1,4})\.?PK\.?(\d+)$/);
  if (pk) {
    keys.add(`${pk[1]}.PK${pk[2]}`);
    keys.add(`#${pk[1]}.PK${pk[2]}`);
  }
  return [...keys].filter((k) => k.length >= 3);
}
function displayRef(raw) {
  const keys = orderKeys(raw);
  return keys.find((k) => /^ORD-\d{4}-\d+$/.test(k)) || String(raw || "").replace(/^#/, "").trim();
}
function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

async function main() {
  const payload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const Batch = db.collection("couriersettlementbatches");
  const Line = db.collection("couriersettlementlines");
  const Order = db.collection("orders");
  const Product = db.collection("products");

  const allTrackings = new Set();
  const allOrderNums = new Set();
  for (const b of payload.batches) {
    for (const l of b.lines || []) {
      for (const k of trackingKeys(l.trackingNumber)) allTrackings.add(k);
      for (const k of orderKeys(l.orderNumberHint || l.sheetOrderNumber || "")) {
        allOrderNums.add(k);
      }
    }
  }

  const trackList = [...allTrackings];
  const orderList = [...allOrderNums];
  const or = [];
  if (trackList.length) {
    or.push({ trackingNumber: { $in: trackList } });
    or.push({ "tracking.number": { $in: trackList } });
  }
  if (orderList.length) {
    or.push({ orderNumber: { $in: orderList } });
  }

  const orders = or.length
    ? await Order.find(
        { $or: or },
        {
          projection: {
            orderNumber: 1,
            trackingNumber: 1,
            "tracking.number": 1,
            items: 1,
            "pricing.total": 1,
          },
        }
      ).toArray()
    : [];

  const byTracking = new Map();
  const byOrder = new Map();
  for (const o of orders) {
    for (const k of trackingKeys(o.trackingNumber)) if (!byTracking.has(k)) byTracking.set(k, o);
    for (const k of trackingKeys(o.tracking?.number)) if (!byTracking.has(k)) byTracking.set(k, o);
    for (const k of orderKeys(o.orderNumber)) if (!byOrder.has(k)) byOrder.set(k, o);
  }

  console.log(`Orders loaded for match: ${orders.length}`);

  const summary = [];
  for (const parsed of payload.batches) {
    const existing = await Batch.findOne({ cprNumber: parsed.cprNumber });
    if (existing) {
      console.log(`SKIP exists ${parsed.cprNumber}`);
      summary.push({ cpr: parsed.cprNumber, skipped: true });
      continue;
    }

    const enriched = [];
    for (const line of parsed.lines || []) {
      let order = null;
      for (const k of trackingKeys(line.trackingNumber)) {
        if (byTracking.has(k)) {
          order = byTracking.get(k);
          break;
        }
      }
      const hint = line.orderNumberHint || line.sheetOrderNumber || "";
      if (!order) {
        for (const k of orderKeys(hint)) {
          if (byOrder.has(k)) {
            order = byOrder.get(k);
            break;
          }
        }
      }
      const sheetRef = displayRef(hint);
      let productCogs = 0;
      let matchStatus = "unmatched";
      let orderId = null;
      let orderNumber = sheetRef;
      if (order) {
        matchStatus = "matched";
        orderId = order._id;
        orderNumber = order.orderNumber || sheetRef;
        let cost = 0;
        const ids = (order.items || []).map((it) => it.productId).filter(Boolean);
        const products = ids.length
          ? await Product.find(
              { _id: { $in: ids } },
              { projection: { "pricing.costPerItem": 1 } }
            ).toArray()
          : [];
        const costMap = new Map(
          products.map((p) => [String(p._id), Number(p.pricing?.costPerItem) || 0])
        );
        for (const it of order.items || []) {
          const qty = Math.max(1, Number(it.quantity) || 1);
          let unit = Number(it.unitCost);
          if (!Number.isFinite(unit) || unit <= 0) {
            unit = it.productId ? costMap.get(String(it.productId)) || 0 : 0;
          }
          cost += Math.max(0, unit) * qty;
        }
        productCogs = round2(cost);
      }

      const net = Number(line.netAmount) || 0;
      const lineProfit = line.status === "Delivered" ? round2(net - productCogs) : 0;
      enriched.push({
        ...line,
        trackingNumber: compactTracking(line.trackingNumber) || line.trackingNumber,
        orderId,
        orderNumber,
        matchStatus,
        productCogs,
        lineProfit,
        returnReceivedStatus: "pending",
      });
    }

    const matchedCount = enriched.filter(
      (l) => l.matchStatus === "matched" || l.matchStatus === "manual"
    ).length;
    const unmatchedCount = enriched.filter((l) => l.matchStatus === "unmatched").length;
    const matchedDelivered = enriched.filter(
      (l) =>
        l.status === "Delivered" &&
        (l.matchStatus === "matched" || l.matchStatus === "manual")
    );
    const productCogsTotal = round2(
      matchedDelivered.reduce((s, l) => s + (Number(l.productCogs) || 0), 0)
    );
    const returnFeesTotal = round2(
      enriched
        .filter((l) => l.status === "Return")
        .reduce((s, l) => {
          const n = Number(l.netAmount) || 0;
          if (n < 0) return s + Math.abs(n);
          return s + (Number(l.shippingCharges) || 0) + (Number(l.gst) || 0);
        }, 0)
    );
    const profitTotal = round2((Number(parsed.netTotal) || 0) - productCogsTotal);

    const now = new Date();
    const batchDoc = {
      cprNumber: parsed.cprNumber,
      cprDate: parsed.cprDate ? new Date(parsed.cprDate) : null,
      courier: parsed.courier || "PostEx",
      filename: parsed.filename || "",
      deliveredCount: parsed.deliveredCount || 0,
      returnedCount: parsed.returnedCount || 0,
      codTotal: parsed.codTotal || 0,
      shippingCharges: parsed.shippingCharges || 0,
      gst: parsed.gst || 0,
      deduction4pct: parsed.deduction4pct || 0,
      netTotal: parsed.netTotal || 0,
      status: "draft",
      uploadedBy: "CPR import",
      postedAt: null,
      postedBy: "",
      lineCount: enriched.length,
      matchedCount,
      unmatchedCount,
      productCogsTotal,
      returnFeesTotal,
      profitTotal,
      createdAt: now,
      updatedAt: now,
    };

    const ins = await Batch.insertOne(batchDoc);
    const batchId = ins.insertedId;
    if (enriched.length) {
      await Line.insertMany(
        enriched.map((l) => ({
          batchId,
          trackingNumber: l.trackingNumber,
          status: l.status || "Unknown",
          codAmount: l.codAmount || 0,
          shippingCharges: l.shippingCharges || 0,
          gst: l.gst || 0,
          deduction4pct: l.deduction4pct || 0,
          netAmount: l.netAmount || 0,
          originCity: l.originCity || "",
          destinationCity: l.destinationCity || "",
          weightKg: l.weightKg || 0,
          bookingDate: l.bookingDate ? new Date(l.bookingDate) : null,
          deliveryReturnDate: l.deliveryReturnDate ? new Date(l.deliveryReturnDate) : null,
          orderId: l.orderId || null,
          orderNumber: l.orderNumber || "",
          matchStatus: l.matchStatus,
          productCogs: l.productCogs || 0,
          lineProfit: l.lineProfit || 0,
          returnReceivedStatus: "pending",
          returnReceivedAt: null,
          returnReceivedBy: "",
          createdAt: now,
          updatedAt: now,
        }))
      );
    }

    const row = {
      cpr: parsed.cprNumber,
      lines: enriched.length,
      matched: matchedCount,
      unmatched: unmatchedCount,
      net: parsed.netTotal,
      cogs: productCogsTotal,
      returnFees: returnFeesTotal,
      profit: profitTotal,
    };
    summary.push(row);
    console.log(JSON.stringify(row));
  }

  console.log("---");
  console.log(
    JSON.stringify(
      {
        imported: summary.filter((s) => !s.skipped).length,
        skipped: summary.filter((s) => s.skipped).length,
        totalMatched: summary.reduce((s, r) => s + (r.matched || 0), 0),
        totalLines: summary.reduce((s, r) => s + (r.lines || 0), 0),
        totalProfit: round2(summary.reduce((s, r) => s + (r.profit || 0), 0)),
      },
      null,
      2
    )
  );
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
