/**
 * One parcel row from a courier remittance sheet.
 */
import mongoose from "mongoose";

const courierSettlementLineSchema = new mongoose.Schema(
  {
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourierSettlementBatch",
      required: true,
      index: true,
    },
    trackingNumber: { type: String, required: true, trim: true, index: true },
    status: {
      type: String,
      enum: ["Delivered", "Return", "Unknown"],
      default: "Unknown",
      index: true,
    },
    codAmount: { type: Number, default: 0 },
    shippingCharges: { type: Number, default: 0 },
    gst: { type: Number, default: 0 },
    deduction4pct: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    originCity: { type: String, default: "", trim: true },
    destinationCity: { type: String, default: "", trim: true },
    weightKg: { type: Number, default: 0 },
    bookingDate: { type: Date, default: null },
    deliveryReturnDate: { type: Date, default: null },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },
    orderNumber: { type: String, default: "", trim: true },
    matchStatus: {
      type: String,
      enum: ["matched", "unmatched", "manual", "ignored"],
      default: "unmatched",
      index: true,
    },
    productCogs: { type: Number, default: 0 },
    lineProfit: { type: Number, default: 0 },
  },
  { timestamps: true }
);

courierSettlementLineSchema.index({ batchId: 1, trackingNumber: 1 }, { unique: true });

export default mongoose.models.CourierSettlementLine ||
  mongoose.model("CourierSettlementLine", courierSettlementLineSchema);
