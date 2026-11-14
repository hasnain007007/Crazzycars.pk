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
    /** Mobile network / ISP from the IP lookup (Jazz, Zong, PTCL…). */
    network: { type: String, default: "", trim: true },
    /** IP the city above was looked up for (redo the lookup when it changes). */
    geoIp: { type: String, default: "" },
    device: { type: String, default: "", trim: true },
    /** First page of this visit, and where the visitor came from. */
    landingPath: { type: String, default: "", trim: true },
    source: { type: String, default: "", trim: true },
    referrerHost: { type: String, default: "", trim: true },
    firstSeen: { type: Date },
    pageViews: { type: Number, default: 0 },
  },
  { timestamps: true }
);

livePresenceSchema.index({ lastSeen: 1 }, { expireAfterSeconds: 600 });

export default mongoose.models.LivePresence || mongoose.model("LivePresence", livePresenceSchema);
