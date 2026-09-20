/**
 * Recalc settlement line product amounts (cost or sale price) + batch P/L.
 * Run in admin container: NODE_PATH=/app/node_modules node /tmp/recalc-settlement-pl.cjs
 */
const mongoose = require("mongoose");

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

async function productCut(order, Product) {
  let total = 0;
  const ids = (order.items || []).map((it) => it.productId).filter(Boolean);
  const products = ids.length
    ? await Product.find(
        { _id: { $in: ids } },
        { projection: { "pricing.costPerItem": 1, "pricing.salePrice": 1, "pricing.regularPrice": 1 } }
      ).toArray()
    : [];
  const map = new Map(
    products.map((p) => [
      String(p._id),
      {
        cost: Number(p.pricing?.costPerItem) || 0,
        sale: Number(p.pricing?.salePrice) || 0,
        regular: Number(p.pricing?.regularPrice) || 0,
      },
    ])
  );
  for (const it of order.items || []) {
    const qty = Math.max(1, Number(it.quantity) || 1);
    const cat = it.productId ? map.get(String(it.productId)) || {} : {};
    let unit = Number(it.unitCost);
    if (!Number.isFinite(unit) || unit <= 0) unit = cat.cost || 0;
    if (!Number.isFinite(unit) || unit <= 0) {
      unit = Number(it.unitPrice) || Number(it.price) || cat.sale || cat.regular || 0;
    }
    total += Math.max(0, unit) * qty;
  }
  return round2(total);
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const Batch = db.collection("couriersettlementbatches");
  const Line = db.collection("couriersettlementlines");
  const Order = db.collection("orders");
  const Product = db.collection("products");

  const batches = await Batch.find({ status: { $in: ["draft", "posted"] } }).toArray();
  for (const b of batches) {
    const lines = await Line.find({ batchId: b._id }).toArray();
    for (const line of lines) {
      if (!line.orderId || (line.matchStatus !== "matched" && line.matchStatus !== "manual")) {
        continue;
      }
      const order = await Order.findOne(
        { _id: line.orderId },
        { projection: { items: 1 } }
      );
      if (!order) continue;
      const productCogs = await productCut(order, Product);
      const net = Number(line.netAmount) || 0;
      const lineProfit =
        line.status === "Delivered" && net > 0
          ? round2(net - productCogs)
          : line.status === "Delivered"
            ? round2(net)
            : 0;
      await Line.updateOne(
        { _id: line._id },
        { $set: { productCogs, lineProfit, updatedAt: new Date() } }
      );
      line.productCogs = productCogs;
      line.lineProfit = lineProfit;
    }

    const matchedDelivered = lines.filter(
      (l) =>
        l.status === "Delivered" &&
        (l.matchStatus === "matched" || l.matchStatus === "manual")
    );
    const productCogsTotal = round2(
      matchedDelivered.reduce((s, l) => s + (Number(l.productCogs) || 0), 0)
    );
    const profitTotal = round2(
      matchedDelivered.reduce((s, l) => s + (Number(l.lineProfit) || 0), 0)
    );
    const returnFeesTotal = round2(
      lines
        .filter((l) => l.status === "Return")
        .reduce((s, l) => {
          const n = Number(l.netAmount) || 0;
          if (n < 0) return s + Math.abs(n);
          return s + (Number(l.shippingCharges) || 0) + (Number(l.gst) || 0);
        }, 0)
    );

    await Batch.updateOne(
      { _id: b._id },
      {
        $set: {
          productCogsTotal,
          returnFeesTotal,
          profitTotal,
          updatedAt: new Date(),
        },
      }
    );
    console.log(
      JSON.stringify({
        cpr: b.cprNumber,
        matchedDelivered: matchedDelivered.length,
        productPricesCut: productCogsTotal,
        profit: profitTotal,
      })
    );
  }
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
