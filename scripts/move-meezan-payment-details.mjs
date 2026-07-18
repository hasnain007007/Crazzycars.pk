// Move Meezan account details from bankTransfer → meezan.
// Run: node scripts/move-meezan-payment-details.mjs
import mongoose from "../storecraft-store/node_modules/mongoose/index.js";
import { readFileSync } from "node:fs";

const env = readFileSync(new URL("../storecraft-store/.env.local", import.meta.url), "utf8");
const uri = env.match(/^MONGODB_URI=(.+)$/m)?.[1]?.trim();
if (!uri) throw new Error("MONGODB_URI not found");

await mongoose.connect(uri);
const coll = mongoose.connection.db.collection("settings");
const doc = await coll.findOne({});
if (!doc) {
  console.log("No settings doc");
  await mongoose.disconnect();
  process.exit(1);
}

const pm = doc.pakistaniPaymentMethods || {};
const from = pm.bankTransfer || {};
const details = {
  enabled: true,
  label: "Meezan Bank",
  bankName: from.bankName || "Meezan Bank",
  accountNumber: from.accountNumber || "090601088167081",
  accountTitle: from.accountTitle || "Hussnian Kamran",
  iban: from.iban || "PK65MEZN0009060108167081",
  icon: "meezan",
};

const res = await coll.updateOne(
  { _id: doc._id },
  {
    $set: {
      "pakistaniPaymentMethods.meezan": details,
      "pakistaniPaymentMethods.bankTransfer.bankName": "Bank Alfalah",
      "pakistaniPaymentMethods.bankTransfer.label": "Bank Alfalah",
      "pakistaniPaymentMethods.bankTransfer.accountNumber": "",
      "pakistaniPaymentMethods.bankTransfer.accountTitle": "",
      "pakistaniPaymentMethods.bankTransfer.iban": "",
    },
  }
);
console.log("Updated", res.modifiedCount, "→ meezan:", details);
await mongoose.disconnect();
