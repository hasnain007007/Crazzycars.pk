/**
 * Standalone sales invoices — separate from storefront Orders.
 */
import mongoose from "mongoose";

const invoiceItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
    name: { type: String, required: true, trim: true },
    image: { type: String, default: "" },
    variation: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    unitCost: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    customer: {
      name: { type: String, required: true, trim: true },
      email: { type: String, default: "", trim: true },
      phone: { type: String, default: "", trim: true },
    },
    billingAddress: {
      street: { type: String, default: "" },
      city: { type: String, default: "" },
      country: { type: String, default: "Pakistan" },
    },
    items: { type: [invoiceItemSchema], default: [] },
    pricing: {
      subtotal: { type: Number, default: 0, min: 0 },
      discount: { type: Number, default: 0, min: 0 },
      shippingCost: { type: Number, default: 0, min: 0 },
      total: { type: Number, required: true, min: 0 },
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "partial"],
      default: "paid",
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: [
        "cod",
        "jazzcash",
        "easypaisa",
        "bankTransfer",
        "hbl",
        "meezan",
        "ubl",
        "stripe",
        "paypal",
      ],
      default: "cod",
    },
    currency: { type: String, default: "PKR" },
    note: { type: String, default: "", trim: true },
    createdBy: { type: String, default: "Admin", trim: true },
  },
  { timestamps: true }
);

invoiceSchema.index({ createdAt: -1 });
invoiceSchema.index({ "customer.name": 1 });
invoiceSchema.index({ "customer.phone": 1 });

export default mongoose.models.Invoice || mongoose.model("Invoice", invoiceSchema);
