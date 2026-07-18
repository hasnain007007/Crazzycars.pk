// Set flat delivery Rs. 250 and disable free delivery on advance payment.
// Run: node scripts/set-delivery-250.mjs
import mongoose from "../storecraft-store/node_modules/mongoose/index.js";
import { readFileSync } from "node:fs";

const env = readFileSync(new URL("../storecraft-store/.env.local", import.meta.url), "utf8");
const uri = env.match(/^MONGODB_URI=(.+)$/m)?.[1]?.trim();
if (!uri) throw new Error("MONGODB_URI not found");

await mongoose.connect(uri);
const r = await mongoose.connection.db.collection("settings").updateMany(
  {},
  {
    $set: {
      "storePayment.flatDeliveryCharge": 250,
      "storePayment.freeShippingOnAdvancePayment": false,
      "storePayment.freeShippingOnOrderAboveEnabled": false,
      "storePayment.advancePaymentAmount": 250,
      "storePayment.advancePaymentMessageEnabled": true,
      "storePayment.advancePaymentMessage":
        "To confirm your order, please pay delivery charges of {amount} in advance. Send payment screenshot on WhatsApp to confirm.",
      "storePayment.advancePaymentDiscountEnabled": true,
      "storePayment.advancePaymentDiscountPercent": 3,
      "storePayment.deliveryNote": "Delivery charges Rs. 250",
    },
  }
);
console.log("Updated", r.modifiedCount, "settings doc(s)");
const doc = await mongoose.connection.db.collection("settings").findOne(
  {},
  { projection: { storePayment: 1 } }
);
console.log(
  JSON.stringify(
    {
      flatDeliveryCharge: doc?.storePayment?.flatDeliveryCharge,
      freeShippingOnAdvancePayment: doc?.storePayment?.freeShippingOnAdvancePayment,
      freeShippingOnOrderAboveEnabled: doc?.storePayment?.freeShippingOnOrderAboveEnabled,
      advancePaymentAmount: doc?.storePayment?.advancePaymentAmount,
    },
    null,
    2
  )
);
await mongoose.disconnect();
