/**
 * Activity log model used to audit admin and API mutations.
 */
import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    userName: {
      type: String,
      default: "System",
      trim: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    resource: {
      type: String,
      default: "",
      trim: true,
    },
    resourceId: {
      type: String,
      default: "",
      trim: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    type: {
      type: String,
      enum: [
        "create",
        "update",
        "delete",
        "login",
        "logout",
        "restock_request",
        "stock_update",
        "customer",
        "coupon",
        "user",
        "review",
        "banner",
        "blog",
        "settings",
      ],
      default: "update",
      index: true,
    },
    ip: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ userName: 1, createdAt: -1 });

export default mongoose.models.ActivityLog ||
  mongoose.model("ActivityLog", activityLogSchema);
