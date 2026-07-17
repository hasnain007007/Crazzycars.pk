/**
 * Seed 10 demo customers (Pakistani names, Lahore/Karachi).
 * Optionally links unlinked orders to these customers by email + customerId.
 * Re-run safe: removes prior rows with emails @pk-seed.storecraft.test
 *
 * Run: node scripts/seed-customers.mjs
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

const { default: Customer } = await import("../lib/models/Customer.model.js");
const { default: Order } = await import("../lib/models/Order.model.js");

const SEED_DOMAIN = "@pk-seed.storecraft.test";

const rows = [
  {
    name: "Ayesha Khan",
    email: `ayesha.khan${SEED_DOMAIN}`,
    phone: "+92 300 1122334",
    address: { street: "45 MM Alam Road", city: "Lahore", state: "Punjab", country: "Pakistan", zip: "54000" },
    status: "active",
  },
  {
    name: "Hassan Malik",
    email: `hassan.malik${SEED_DOMAIN}`,
    phone: "+92 321 5566778",
    address: { street: "12 DHA Phase 5", city: "Lahore", state: "Punjab", country: "Pakistan", zip: "54792" },
    status: "active",
  },
  {
    name: "Fatima Sheikh",
    email: `fatima.sheikh${SEED_DOMAIN}`,
    phone: "+92 333 9988776",
    address: { street: "88 Gulberg III", city: "Lahore", state: "Punjab", country: "Pakistan", zip: "54660" },
    status: "active",
  },
  {
    name: "Bilal Ahmed",
    email: `bilal.ahmed${SEED_DOMAIN}`,
    phone: "+92 345 2233445",
    address: { street: "3 Clifton Block 2", city: "Karachi", state: "Sindh", country: "Pakistan", zip: "75600" },
    status: "blocked",
  },
  {
    name: "Sana Raza",
    email: `sana.raza${SEED_DOMAIN}`,
    phone: "+92 311 4455667",
    address: { street: "22 Bahria Town Phase 4", city: "Karachi", state: "Sindh", country: "Pakistan", zip: "75500" },
    status: "active",
  },
  {
    name: "Omar Farooq",
    email: `omar.farooq${SEED_DOMAIN}`,
    phone: "+92 322 7788990",
    address: { street: "9 Johar Town", city: "Lahore", state: "Punjab", country: "Pakistan", zip: "54782" },
    status: "active",
  },
  {
    name: "Zainab Hussain",
    email: `zainab.hussain${SEED_DOMAIN}`,
    phone: "+92 304 6677889",
    address: { street: "17 DHA Phase 6", city: "Karachi", state: "Sindh", country: "Pakistan", zip: "75500" },
    status: "active",
  },
  {
    name: "Usman Tariq",
    email: `usman.tariq${SEED_DOMAIN}`,
    phone: "+92 335 1122003",
    address: { street: "4 Model Town Extension", city: "Lahore", state: "Punjab", country: "Pakistan", zip: "54700" },
    status: "active",
  },
  {
    name: "Maryam Iqbal",
    email: `maryam.iqbal${SEED_DOMAIN}`,
    phone: "+92 300 5544332",
    address: { street: "60 North Nazimabad", city: "Karachi", state: "Sindh", country: "Pakistan", zip: "74700" },
    status: "active",
  },
  {
    name: "Imran Siddiqui",
    email: `imran.siddiqui${SEED_DOMAIN}`,
    phone: "+92 321 9900112",
    address: { street: "14 Gulistan-e-Jauhar", city: "Karachi", state: "Sindh", country: "Pakistan", zip: "75290" },
    status: "active",
  },
];

async function main() {
  await mongoose.connect(MONGODB_URI);

  const removed = await Customer.deleteMany({ email: { $regex: `@pk-seed\\.storecraft\\.test$`, $options: "i" } });
  if (removed.deletedCount) console.log(`Removed ${removed.deletedCount} previous pk-seed customers.`);

  const created = await Customer.insertMany(rows);
  console.log(`Inserted ${created.length} customers.`);

  const unlinked = await Order.find({
    $or: [{ "customer.customerId": null }, { "customer.customerId": { $exists: false } }],
  })
    .sort({ createdAt: 1 })
    .limit(created.length)
    .select("_id customer shippingAddress")
    .lean();

  let linked = 0;
  for (let i = 0; i < unlinked.length && i < created.length; i += 1) {
    const c = created[i];
    const o = unlinked[i];
    await Order.updateOne(
      { _id: o._id },
      {
        $set: {
          "customer.customerId": c._id,
          "customer.name": c.name,
          "customer.email": c.email,
          "customer.phone": c.phone,
          "shippingAddress.name": c.name,
          "shippingAddress.phone": c.phone,
          "shippingAddress.street": c.address?.street || "",
          "shippingAddress.city": c.address?.city || "",
          "shippingAddress.state": c.address?.state || "",
          "shippingAddress.country": c.address?.country || "",
          "shippingAddress.zip": c.address?.zip || "",
        },
      }
    );
    linked += 1;
  }
  console.log(`Linked ${linked} orders to pk-seed customers (where orders had no customerId).`);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
