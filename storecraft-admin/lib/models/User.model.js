/**
 * User model for admin and staff authentication/authorization.
 */
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      // Canonical: owner | manager | staff | viewer
      // Legacy aliases kept in enum for one deploy cycle (JWT/DB read); new writes use canonical only.
      enum: ["owner", "manager", "staff", "viewer", "superadmin", "admin", "editor"],
      default: "staff",
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

userSchema.index({ createdAt: -1 });

export default mongoose.models.User || mongoose.model("User", userSchema);
