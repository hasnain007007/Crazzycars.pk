/**
 * Mobile device registration — push notification tokens / device info.
 * Linked to a customer on login; guest devices have customerId=null.
 */
import mongoose from "mongoose";

const mobileDeviceSchema = new mongoose.Schema(
  {
    /** FCM/APNs push token or device UUID from the app. */
    token: { type: String, required: true, unique: true, trim: true },
    platform: { type: String, default: "", trim: true }, // "ios" | "android"
    appVersion: { type: String, default: "", trim: true },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.MobileDevice ||
  mongoose.model("MobileDevice", mobileDeviceSchema);
