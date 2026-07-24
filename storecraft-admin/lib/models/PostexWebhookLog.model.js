/**
 * Temporary review log for Postex status webhooks.
 * First 20 accepted calls store the full raw payload for portal debugging.
 */
import mongoose from "mongoose";

const postexWebhookLogSchema = new mongoose.Schema(
  {
    receivedAt: { type: Date, default: Date.now, index: true },
    ok: { type: Boolean, default: false },
    httpStatus: { type: Number, default: 200 },
    outcome: { type: String, default: "", trim: true },
    trackingNumber: { type: String, default: "", trim: true, index: true },
    orderReferenceNumber: { type: String, default: "", trim: true },
    postexStatus: { type: String, default: "", trim: true },
    orderId: { type: String, default: "", trim: true, index: true },
    orderNumber: { type: String, default: "", trim: true },
    mappedOrderStatus: { type: String, default: "", trim: true },
    codMarkedPaid: { type: Boolean, default: false },
    whatsappWouldNotify: { type: Boolean, default: false },
    whatsappPreview: { type: String, default: "" },
    /** Full body — only filled for the first N calls (see route). */
    rawPayload: { type: mongoose.Schema.Types.Mixed, default: null },
    error: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.PostexWebhookLog ||
  mongoose.model("PostexWebhookLog", postexWebhookLogSchema);
