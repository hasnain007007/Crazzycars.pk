/**
 * Active / abandoned storefront carts (synced from the browser).
 * Same collection as storecraft-admin CartSession.
 */
import mongoose from "mongoose";
import crypto from "crypto";

const cartItemSchema = new mongoose.Schema(
  {
    productId: { type: String, default: "" },
    slug: { type: String, default: "" },
    name: { type: String, default: "" },
    image: { type: String, default: "" },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    variantId: { type: String, default: "" },
    variationLabel: { type: String, default: "" },
    selectedOptions: { type: mongoose.Schema.Types.Mixed, default: undefined },
    matchedCombination: { type: mongoose.Schema.Types.Mixed, default: undefined },
    selectedVariation: { type: mongoose.Schema.Types.Mixed, default: undefined },
    selectedAddOns: { type: [mongoose.Schema.Types.Mixed], default: undefined },
    categoryIds: { type: [String], default: undefined },
    requiresVariant: { type: Boolean, default: false },
    articleNo: { type: String, default: "" },
    sku: { type: String, default: "" },
  },
  { _id: false }
);

const reminderSchema = new mongoose.Schema(
  {
    channel: { type: String, enum: ["email", "whatsapp"], default: "email" },
    sentAt: { type: Date, default: Date.now },
    status: { type: String, enum: ["sent", "failed", "opened"], default: "sent" },
    note: { type: String, default: "" },
  },
  { _id: false }
);

const cartSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, trim: true },
    recoveryToken: {
      type: String,
      default: () => crypto.randomBytes(24).toString("hex"),
      index: true,
    },
    items: { type: [cartItemSchema], default: [] },
    itemCount: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
    customer: {
      name: { type: String, default: "", trim: true },
      email: { type: String, default: "", trim: true, lowercase: true },
      phone: { type: String, default: "", trim: true },
    },
    status: {
      type: String,
      enum: ["active", "abandoned", "recovered", "dismissed"],
      default: "active",
      index: true,
    },
    lastActivityAt: { type: Date, default: Date.now, index: true },
    abandonedAt: { type: Date, default: null },
    recoveredAt: { type: Date, default: null },
    convertedOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
    convertedOrderNumber: { type: String, default: "" },
    reminders: { type: [reminderSchema], default: [] },
    emailReminderCount: { type: Number, default: 0 },
    lastEmailReminderAt: { type: Date, default: null },
    lastPath: { type: String, default: "", trim: true },
    userAgent: { type: String, default: "", trim: true },
    /** Soft expiry — Mongo TTL removes old sessions after 45 days of inactivity. */
    expiresAt: { type: Date, default: () => new Date(Date.now() + 45 * 24 * 60 * 60 * 1000) },
  },
  { timestamps: true }
);

cartSessionSchema.index({ status: 1, lastActivityAt: -1 });
cartSessionSchema.index({ "customer.email": 1, status: 1 });
cartSessionSchema.index({ "customer.phone": 1, status: 1 });
cartSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.CartSession || mongoose.model("CartSession", cartSessionSchema);
