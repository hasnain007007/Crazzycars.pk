/**
 * Active storefront visitors (heartbeat presence).
 * Same collection as storecraft-store LivePresence.
 */
import mongoose from "mongoose";

const livePresenceSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    path: { type: String, default: "/", trim: true },
    lastSeen: { type: Date, default: Date.now },
    userAgent: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    region: { type: String, default: "", trim: true },
    country: { type: String, default: "", trim: true },
    countryCode: { type: String, default: "", trim: true, uppercase: true },
  },
  { timestamps: true }
);

livePresenceSchema.index({ lastSeen: 1 }, { expireAfterSeconds: 600 });

export default mongoose.models.LivePresence || mongoose.model("LivePresence", livePresenceSchema);
