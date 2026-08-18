/**
 * Unique storefront visitors per calendar day (Asia/Karachi).
 * Same collection as storecraft-store DailyVisitor.
 */
import mongoose from "mongoose";

const dailyVisitorSchema = new mongoose.Schema(
  {
    dayKey: { type: String, required: true, trim: true },
    sessionId: { type: String, required: true, trim: true },
    firstSeen: { type: Date, default: Date.now },
    lastSeen: { type: Date, default: Date.now },
    path: { type: String, default: "/", trim: true },
    hits: { type: Number, default: 1, min: 1 },
  },
  { timestamps: true }
);

dailyVisitorSchema.index({ dayKey: 1, sessionId: 1 }, { unique: true });
dailyVisitorSchema.index({ dayKey: 1 });

export default mongoose.models.DailyVisitor || mongoose.model("DailyVisitor", dailyVisitorSchema);
