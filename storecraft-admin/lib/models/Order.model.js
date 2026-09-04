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
    /** Opaque token for guest success-page lookup (storefront). */
    publicAccessToken: { type: String, default: "", trim: true, index: true },
    customer: {
      firstName: { type: String, default: "", trim: true },
      lastName: { type: String, default: "", trim: true },
      name: { type: String, default: "", trim: true },
      email: { type: String, default: "", trim: true },
      phone: { type: String, default: "", trim: true },
      customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null },
    },
    subtotal: { type: Number, default: 0, min: 0 },
    shippingCost: { type: Number, default: 0, min: 0 },
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
    currency: { type: String, default: "PKR" },
    payment: {
      paypalOrderId: { type: String, default: "" },
      paypalCaptureId: { type: String, default: "" },
      transactionId: { type: String, default: "" },
      stripePaymentIntentId: { type: String, default: "" },
      paidAt: { type: Date },
      amount: { type: Number, default: 0 },
      /** Amount already collected when paymentStatus is partial */
      paidAmount: { type: Number, default: 0, min: 0 },
      /** Remaining COD to collect on delivery */
      remainingCod: { type: Number, default: 0, min: 0 },
      /** Advance amount customer must pay before dispatch (e.g. 50% of goods). */
      advanceRequired: { type: Number, default: 0, min: 0 },
      advanceMode: { type: String, default: "", trim: true },
      advanceMaxPercent: { type: Number, default: 0, min: 0, max: 100 },
    },
    /**
     * Manual bank-transfer / WhatsApp screenshot confirmation audit trail.
     * Set when staff mark payment paid or partial — not freeform notes.
     */
    paymentConfirmation: {
      reference: { type: String, default: "", trim: true },
      confirmedBy: { type: String, default: "", trim: true },
      confirmedAt: { type: Date, default: null },
    },
    shippingAddress: {
      firstName: { type: String, default: "" },
      lastName: { type: String, default: "" },
      name: { type: String, default: "" },
      email: { type: String, default: "" },
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
    postexLabel: { type: String, default: "", trim: true },
    /** Cached Run Courier label (base64 PDF) — separate from postexLabel. */
    runCourierLabel: { type: String, default: "", trim: true },
    /** Select API used for Run Courier booking (Trax, TCS, Auto, …). */
    runCourierApi: { type: String, default: "", trim: true },
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
    /** Freeform ops labels (e.g. needs-callback, wrong-address) — not a fixed enum. */
    tags: { type: [String], default: [], index: true },
    whatsappNotified: { type: Boolean, default: false },
    /**
     * True when the customer tapped Yes on the signed WhatsApp confirm link.
     * Independent of warehouse orderStatus (staff can mark confirmed without this).
     */
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
    /** Source walk-in Invoice when created via “Add to orders”. */
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
