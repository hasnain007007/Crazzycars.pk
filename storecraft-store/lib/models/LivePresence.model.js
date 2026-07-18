/**
 * Active storefront visitors (heartbeat presence).
 * Shared collection name so admin can read counts from the same MongoDB.
 */
import mongoose from "mongoose";

const livePresenceSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    path: { type: String, default: "/", trim: true },
    lastSeen: { type: Date, default: Date.now, index: true },
    userAgent: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

livePresenceSchema.index({ lastSeen: 1 }, { expireAfterSeconds: 600 });

export default mongoose.models.LivePresence || mongoose.model("LivePresence", livePresenceSchema);
