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

/** Shopkeeper installment / partial payment entry */
const invoicePaymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    paidAt: { type: Date, default: Date.now },
    method: {
      type: String,
      enum: [
        "cod",
        "cash",
        "jazzcash",
        "easypaisa",
        "bankTransfer",
        "hbl",
        "meezan",
        "ubl",
        "other",
      ],
      default: "cash",
    },
    note: { type: String, default: "", trim: true },
    recordedBy: { type: String, default: "", trim: true },
    /** Links payment to a single-receiving Receipt (BR-…) for edit/delete */
    receiptNumber: { type: String, default: "", trim: true, index: true },
  },
  { _id: true, timestamps: { createdAt: true, updatedAt: false } }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    customer: {
      name: { type: String, required: true, trim: true },
      email: { type: String, default: "", trim: true },
      phone: { type: String, default: "", trim: true },
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
      index: true,
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
      default: "unpaid",
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
        "cash",
        "other",
      ],
      default: "cod",
    },
    /** Running total of installment payments received */
    amountPaid: { type: Number, default: 0, min: 0 },
    /** pricing.total − amountPaid (never negative) */
    remainingBalance: { type: Number, default: 0, min: 0 },
    /**
     * Other bills outstanding for this shopkeeper at invoice create time
     * (for print: Previous Balance → Total Receivables).
     */
    previousBalance: { type: Number, default: 0 },
    payments: { type: [invoicePaymentSchema], default: [] },
    currency: { type: String, default: "PKR" },
    note: { type: String, default: "", trim: true },
    createdBy: { type: String, default: "Admin", trim: true },
    /** Linked fulfillment Order created via “Add to orders” (optional). */
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },
    orderNumber: { type: String, default: "", trim: true, index: true },
  },
  { timestamps: true }
);

invoiceSchema.index({ createdAt: -1 });
invoiceSchema.index({ "customer.name": 1 });
invoiceSchema.index({ "customer.phone": 1 });
invoiceSchema.index({ customerId: 1, createdAt: -1 });

export default mongoose.models.Invoice || mongoose.model("Invoice", invoiceSchema);
