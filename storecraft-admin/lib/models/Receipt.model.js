/**
 * Customer / shopkeeper single receiving (bank receipt) — can allocate across multiple invoices.
 */
import mongoose from "mongoose";

const receiptAllocationSchema = new mongoose.Schema(
  {
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", required: true },
    invoiceNumber: { type: String, default: "" },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const receiptSchema = new mongoose.Schema(
  {
    receiptNumber: { type: String, required: true, unique: true, index: true },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    customerName: { type: String, default: "", trim: true },
    amount: { type: Number, required: true, min: 0 },
    /** Portion not applied to any invoice (advance / credit) */
    unallocatedAmount: { type: Number, default: 0, min: 0 },
    paidAt: { type: Date, default: Date.now, index: true },
    method: {
      type: String,
      enum: [
        "cash",
        "cod",
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
    particular: { type: String, default: "", trim: true },
    allocations: { type: [receiptAllocationSchema], default: [] },
    recordedBy: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

receiptSchema.index({ customerId: 1, paidAt: -1 });
receiptSchema.index({ createdAt: -1 });

export default mongoose.models.Receipt || mongoose.model("Receipt", receiptSchema);
