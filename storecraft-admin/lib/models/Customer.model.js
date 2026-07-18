/**
 * Customer model for storefront buyers linked to orders (admin app; keep in sync with store schema).
 */
import mongoose from "mongoose";

const addressSubSchema = new mongoose.Schema(
  {
    label: { type: String, default: "Home" },
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    phone: { type: String, default: "" },
    street: { type: String, default: "" },
    address: { type: String, default: "" },
    street2: { type: String, default: "" },
    area: { type: String, default: "" },
    city: { type: String, default: "" },
    province: { type: String, default: "" },
    state: { type: String, default: "" },
    postcode: { type: String, default: "" },
    zip: { type: String, default: "" },
    country: { type: String, default: "Pakistan" },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const wishlistSubSchema = new mongoose.Schema(
  {
    productId: String,
    name: String,
    slug: String,
    price: Number,
    image: String,
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const customerSchema = new mongoose.Schema(
  {
    firstName: { type: String, default: "", trim: true },
    lastName: { type: String, default: "", trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: "" },
    dateOfBirth: { type: Date },
    avatar: { type: String, default: "" },
    address: {
      street: String,
      street2: String,
      area: String,
      city: String,
      state: String,
      country: String,
      zip: String,
    },
    addresses: { type: [addressSubSchema], default: [] },
    wishlist: { type: [wishlistSubSchema], default: [] },
    status: {
      type: String,
      enum: ["active", "blocked", "inactive"],
      default: "active",
      index: true,
    },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    lastLogin: { type: Date },
    password: { type: String, default: "", select: false },
    passwordHash: { type: String, default: "", select: false },
  },
  { timestamps: true }
);

customerSchema.index({ createdAt: -1 });

export default mongoose.models.Customer || mongoose.model("Customer", customerSchema);
