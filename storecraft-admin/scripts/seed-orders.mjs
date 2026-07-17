/**
 * Seed 8 demo orders (re-runnable: removes prior rows with coupon DEMO2026).
 * Run from project root: node scripts/seed-orders.mjs
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mongoose from "mongoose";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI in .env.local");
  process.exit(1);
}

const { default: Product } = await import("../lib/models/Product.model.js");
const { default: Order } = await import("../lib/models/Order.model.js");
const { default: Customer } = await import("../lib/models/Customer.model.js");
const { allocateOrderNumber } = await import("../lib/orderNumber.js");

const DEMO_COUPON = "DEMO2026";

function lineFromProduct(p, qty, variation = "") {
  const unit = Number(p.pricing?.regularPrice) || 0;
  const image = p.media?.images?.find((i) => i.isMain)?.url || p.media?.images?.[0]?.url || "";
  return {
    productId: p._id,
    name: p.name,
    image,
    variation,
    quantity: qty,
    unitPrice: unit,
    total: Math.round(unit * qty * 100) / 100,
  };
}

function sumLines(lines) {
  return lines.reduce((s, l) => s + l.total, 0);
}

async function main() {
  await mongoose.connect(MONGODB_URI);

  const deleted = await Order.deleteMany({ couponCode: DEMO_COUPON });
  if (deleted.deletedCount) console.log(`Removed ${deleted.deletedCount} previous demo orders.`);

  await Customer.deleteMany({
    email: { $in: ["alex.rivera.demo@storecraft.test", "jordan.lee.demo@storecraft.test"] },
  });

  const byArticle = async (code) => {
    const p = await Product.findOne({ articleNo: code }).lean();
    if (!p) throw new Error(`Missing product ${code}. Run scripts/seed-products.mjs first.`);
    return p;
  };

  const tshirt = await byArticle("TSH-001");
  const headphones = await byArticle("ELC-001");
  const wallet = await byArticle("ACC-001");
  const shoes = await byArticle("SHO-001");
  const coffee = await byArticle("HOM-001");

  const cust1 = await Customer.create({
    name: "Alex Rivera",
    email: "alex.rivera.demo@storecraft.test",
    phone: "+1 555-0101",
    address: { street: "120 Oak St", city: "Austin", state: "TX", country: "USA", zip: "78701" },
  });
  const cust2 = await Customer.create({
    name: "Jordan Lee",
    email: "jordan.lee.demo@storecraft.test",
    phone: "+1 555-0102",
    address: { street: "88 Pine Ave", city: "Seattle", state: "WA", country: "USA", zip: "98101" },
  });
  console.log("Created demo customers:", cust1.email, cust2.email);

  const scenarios = [
    {
      label: "pending unpaid",
      customer: { name: "Sam Morgan", email: "sam.morgan@example.com", phone: "+1 555-2001", customerId: null },
      items: [lineFromProduct(tshirt, 1, "Size: M")],
      discount: 0,
      shipping: 5.99,
      orderStatus: "pending",
      paymentStatus: "unpaid",
      paymentMethod: "",
      shippingAddress: {
        name: "Sam Morgan",
        phone: "+1 555-2001",
        street: "410 Maple Rd",
        city: "Denver",
        state: "CO",
        country: "USA",
        zip: "80202",
      },
      history: [{ status: "pending", changedBy: "System", note: "Order placed" }],
    },
    {
      label: "pending unpaid 2",
      customer: { name: "Riley Chen", email: "riley.chen@example.com", phone: "+1 555-2002", customerId: null },
      items: [lineFromProduct(wallet, 1)],
      discount: 0,
      shipping: 4.5,
      orderStatus: "pending",
      paymentStatus: "unpaid",
      paymentMethod: "",
      shippingAddress: {
        name: "Riley Chen",
        phone: "+1 555-2002",
        street: "9 Harbor Ln",
        city: "Miami",
        state: "FL",
        country: "USA",
        zip: "33131",
      },
      history: [{ status: "pending", changedBy: "System", note: "Order placed" }],
    },
    {
      label: "processing paid",
      customer: {
        name: cust1.name,
        email: cust1.email,
        phone: cust1.phone,
        customerId: cust1._id,
      },
      items: [lineFromProduct(headphones, 1), lineFromProduct(coffee, 1)],
      discount: 10,
      shipping: 8,
      orderStatus: "processing",
      paymentStatus: "paid",
      paymentMethod: "Visa ···· 4242",
      shippingAddress: {
        name: cust1.name,
        phone: cust1.phone,
        street: cust1.address.street,
        city: cust1.address.city,
        state: cust1.address.state,
        country: cust1.address.country,
        zip: cust1.address.zip,
      },
      history: [
        { status: "pending", changedBy: "System", note: "Order placed" },
        { status: "processing", changedBy: "Admin", note: "Payment confirmed; preparing shipment." },
      ],
    },
    {
      label: "processing paid 2",
      customer: {
        name: cust2.name,
        email: cust2.email,
        phone: cust2.phone,
        customerId: cust2._id,
      },
      items: [lineFromProduct(shoes, 1, "Size: 10")],
      discount: 0,
      shipping: 0,
      orderStatus: "processing",
      paymentStatus: "paid",
      paymentMethod: "PayPal",
      shippingAddress: {
        name: cust2.name,
        phone: cust2.phone,
        street: cust2.address.street,
        city: cust2.address.city,
        state: cust2.address.state,
        country: cust2.address.country,
        zip: cust2.address.zip,
      },
      history: [
        { status: "pending", changedBy: "System", note: "Order placed" },
        { status: "processing", changedBy: "System", note: "Paid in full." },
      ],
    },
    {
      label: "delivered paid",
      customer: { name: "Taylor Brooks", email: "taylor.brooks@example.com", phone: "+1 555-3003", customerId: null },
      items: [lineFromProduct(coffee, 1)],
      discount: 5,
      shipping: 6.5,
      orderStatus: "delivered",
      paymentStatus: "paid",
      paymentMethod: "Mastercard ···· 8899",
      shippingAddress: {
        name: "Taylor Brooks",
        phone: "+1 555-3003",
        street: "77 Cedar Blvd",
        city: "Portland",
        state: "OR",
        country: "USA",
        zip: "97205",
      },
      history: [
        { status: "pending", changedBy: "System", note: "Order placed" },
        { status: "processing", changedBy: "Admin", note: "Packing" },
        { status: "shipped", changedBy: "Admin", note: "UPS tracking sent" },
        { status: "delivered", changedBy: "Carrier", note: "Delivered" },
      ],
    },
    {
      label: "delivered paid multi",
      customer: { name: "Casey Nguyen", email: "casey.nguyen@example.com", phone: "+1 555-3004", customerId: null },
      items: [lineFromProduct(tshirt, 2, "Size: L"), lineFromProduct(wallet, 1)],
      discount: 0,
      shipping: 7.25,
      orderStatus: "delivered",
      paymentStatus: "paid",
      paymentMethod: "Apple Pay",
      shippingAddress: {
        name: "Casey Nguyen",
        phone: "+1 555-3004",
        street: "300 Market St",
        city: "San Francisco",
        state: "CA",
        country: "USA",
        zip: "94105",
      },
      history: [
        { status: "pending", changedBy: "System", note: "Order placed" },
        { status: "processing", changedBy: "Admin", note: "" },
        { status: "shipped", changedBy: "Admin", note: "" },
        { status: "delivered", changedBy: "Admin", note: "Signed by recipient" },
      ],
    },
    {
      label: "cancelled",
      customer: { name: "Morgan Blake", email: "morgan.blake@example.com", phone: "+1 555-4005", customerId: null },
      items: [lineFromProduct(headphones, 1)],
      discount: 0,
      shipping: 0,
      orderStatus: "cancelled",
      paymentStatus: "unpaid",
      paymentMethod: "",
      shippingAddress: {
        name: "Morgan Blake",
        phone: "+1 555-4005",
        street: "2 River Ct",
        city: "Chicago",
        state: "IL",
        country: "USA",
        zip: "60601",
      },
      history: [
        { status: "pending", changedBy: "System", note: "Order placed" },
        { status: "cancelled", changedBy: "Admin", note: "Customer requested cancellation." },
      ],
    },
    {
      label: "refunded",
      customer: { name: "Jamie Fox", email: "jamie.fox@example.com", phone: "+1 555-5006", customerId: null },
      items: [lineFromProduct(shoes, 1, "Size: 9")],
      discount: 0,
      shipping: 9.99,
      orderStatus: "refunded",
      paymentStatus: "refunded",
      paymentMethod: "Visa ···· 4242",
      shippingAddress: {
        name: "Jamie Fox",
        phone: "+1 555-5006",
        street: "55 Hilltop Dr",
        city: "Boston",
        state: "MA",
        country: "USA",
        zip: "02110",
      },
      history: [
        { status: "pending", changedBy: "System", note: "Order placed" },
        { status: "processing", changedBy: "Admin", note: "Paid" },
        { status: "refunded", changedBy: "Admin", note: "Return processed; full refund issued." },
      ],
    },
  ];

  for (const sc of scenarios) {
    const subtotal = sumLines(sc.items);
    const total = Math.max(0, Math.round((subtotal - sc.discount + sc.shipping) * 100) / 100);
    const orderNumber = await allocateOrderNumber();
    const now = new Date();
    const history = sc.history.map((h) => ({
      status: h.status,
      changedBy: h.changedBy,
      changedAt: now,
      note: h.note || "",
    }));

    const doc = await Order.create({
      orderNumber,
      customer: sc.customer,
      items: sc.items,
      pricing: {
        subtotal,
        discount: sc.discount,
        shippingCost: sc.shipping,
        total,
      },
      orderStatus: sc.orderStatus,
      paymentStatus: sc.paymentStatus,
      paymentMethod: sc.paymentMethod,
      shippingAddress: sc.shippingAddress,
      couponCode: DEMO_COUPON,
      statusHistory: history,
      internalNotes: [
        {
          note: `Demo order (${sc.label}).`,
          addedBy: "Seed Script",
          addedAt: now,
        },
      ],
    });

    console.log(
      `Created order ${doc.orderNumber} | ${sc.label} | total=$${doc.pricing.total} | status=${doc.orderStatus} | payment=${doc.paymentStatus}`
    );
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  mongoose.disconnect().finally(() => process.exit(1));
});
