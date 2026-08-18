import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
    /** Immutable catalogue/pixel ID snapshot captured when the order is placed. */
    articleNo: { type: String, default: "", trim: true },
    name: { type: String, required: true, trim: true },
    image: { type: String, default: "" },
    variation: { type: String, default: "" },
    selectedVariation: { type: Object, default: null },
    selectedAddOns: {
      type: [
        {
          name: { type: String, default: "", trim: true },
          price: { type: Number, default: 0, min: 0 },
        },
      ],
      default: [],
    },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    /** Snapshot of product cost at checkout (admin margin / profit). */
    unitCost: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    advancePercentRequired: { type: Number, default: 0, min: 0, max: 100 },
  },
  { _id: false }
);

const statusHistoryEntrySchema = new mongoose.Schema(
  {
    status: { type: String, required: true, trim: true },
    changedBy: { type: String, default: "System", trim: true },
    changedAt: { type: Date, default: Date.now },
    note: { type: String, default: "", trim: true },
  },
  { _id: true }
);

const internalNoteSchema = new mongoose.Schema(
  {
    note: { type: String, required: true, trim: true },
    addedBy: { type: String, default: "Admin", trim: true },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const timelineEntrySchema = new mongoose.Schema(
  {
    status: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now },
    by: { type: String, default: "system", trim: true },
  },
  { _id: false }
);

const emailHistoryEntrySchema = new mongoose.Schema(
  {
    type: { type: String, default: "order_confirmation", trim: true },
    subject: { type: String, default: "", trim: true },
    to: { type: String, default: "", trim: true },
    sentAt: { type: Date, default: Date.now },
    status: { type: String, enum: ["sent", "failed"], default: "sent" },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    /** Opaque token required for guest success-page order lookup (not guessable from _id alone). */
    publicAccessToken: { type: String, default: "", trim: true, index: true },
    customer: {
      name: { type: String, default: "", trim: true },
      email: { type: String, default: "", trim: true },
      phone: { type: String, default: "", trim: true },
      customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null },
    },
    items: { type: [orderItemSchema], default: [] },
    pricing: {
      subtotal: { type: Number, default: 0, min: 0 },
      discount: { type: Number, default: 0, min: 0 },
      shippingCost: { type: Number, default: 0, min: 0 },
      shippingMethod: { type: String, default: "" },
      shippingZone: { type: String, default: "" },
      total: { type: Number, required: true, min: 0 },
    },
    orderStatus: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "packed",
        "shipped",
        "delivered",
        "returned",
        "cancelled",
        "refunded",
        "disputed",
      ],
      default: "pending",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded", "partial", "failed"],
      default: "unpaid",
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: [
        "cod",
        "stripe",
        "paypal",
        "jazzcash",
        "easypaisa",
        "bankTransfer",
        "hbl",
        "meezan",
        "ubl",
      ],
      default: "cod",
      trim: true,
    },
    payment: {
      stripePaymentIntentId: { type: String, default: "", trim: true },
      paypalOrderId: { type: String, default: "", trim: true },
      paidAt: { type: Date, default: null },
      amount: { type: Number, default: 0, min: 0 },
      paidAmount: { type: Number, default: 0, min: 0 },
      remainingCod: { type: Number, default: 0, min: 0 },
      advanceRequired: { type: Number, default: 0, min: 0 },
      advanceMode: { type: String, default: "", trim: true },
      advanceMaxPercent: { type: Number, default: 0, min: 0, max: 100 },
    },
    currency: { type: String, default: "PKR" },
    shippingAddress: {
      name: { type: String, default: "" },
      phone: { type: String, default: "" },
      street: { type: String, default: "" },
      street2: { type: String, default: "" },
      line1: { type: String, default: "" },
      line2: { type: String, default: "" },
      address: { type: String, default: "" },
      area: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      province: { type: String, default: "" },
      zip: { type: String, default: "" },
      postcode: { type: String, default: "" },
      postalCode: { type: String, default: "" },
      country: { type: String, default: "Pakistan" },
      nif: { type: String, default: "" },
    },
    couponCode: { type: String, default: "", trim: true },
    trackingNumber: { type: String, default: "", trim: true },
    courier: { type: String, default: "Postex", trim: true },
    trackingUrl: { type: String, default: "", trim: true },
    shippedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    tracking: {
      number: { type: String, default: "", trim: true },
      carrier: { type: String, default: "", trim: true },
      url: { type: String, default: "", trim: true },
      notifiedAt: { type: Date, default: null },
      lastStatus: { type: String, default: "", trim: true },
      lastStatusAt: { type: Date, default: null },
      currentLocation: { type: String, default: "", trim: true },
      destinationCity: { type: String, default: "", trim: true },
      destinationReceived: { type: Boolean, default: false },
    },
    statusHistory: { type: [statusHistoryEntrySchema], default: [] },
    internalNotes: { type: [internalNoteSchema], default: [] },
    timeline: { type: [timelineEntrySchema], default: [] },
    emailHistory: { type: [emailHistoryEntrySchema], default: [] },
    whatsappNotified: { type: Boolean, default: false },
    codConfirmed: { type: Boolean, default: false },
    /**
     * Optional first-touch AI referrer attribution (14-day cookie window).
     * Absent on most orders — expected.
     */
    aiAttributedSource: {
      type: String,
      default: "",
      trim: true,
      index: true,
      enum: [
        "",
        "chatgpt",
        "copilot",
        "perplexity",
        "claude",
        "gemini",
        "grok",
        "meta",
        "deepseek",
        "you",
        "google_extended",
        "bing",
        "apple",
        "amazon",
        "bytespider",
        "other_ai",
      ],
    },
    /** Timestamp of the first AI-referrer touch that attributed this order. */
    aiAttributedAt: { type: Date, default: null },
    /** Source walk-in Invoice when created via admin “Add to orders”. */
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      default: null,
      index: true,
    },
    invoiceNumber: { type: String, default: "", trim: true, index: true },
  },
  { timestamps: true }
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });
orderSchema.index({ "customer.email": 1 });
orderSchema.index({ "customer.phone": 1 });
orderSchema.index({ whatsappNotified: 1 });
orderSchema.index({ codConfirmed: 1 });
orderSchema.index({ aiAttributedSource: 1, createdAt: -1 });

export default mongoose.models.Order || mongoose.model("Order", orderSchema);
