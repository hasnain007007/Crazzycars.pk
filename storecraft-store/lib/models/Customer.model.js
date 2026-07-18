import mongoose from "mongoose";

const CustomerSchema = new mongoose.Schema(
  {
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    name: { type: String, default: "" },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, default: "" },
    passwordHash: { type: String, default: "" },
    phone: { type: String, default: "" },
    avatar: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    lastLogin: { type: Date },
    addresses: [
      {
        label: { type: String, default: "Home" },
        firstName: { type: String, default: "" },
        lastName: { type: String, default: "" },
        address: { type: String, default: "" },
        city: { type: String, default: "" },
        postcode: { type: String, default: "" },
        country: { type: String, default: "Pakistan" },
        phone: { type: String, default: "" },
        isDefault: { type: Boolean, default: false },
      },
    ],
    wishlist: [
      {
        productId: { type: String },
        name: { type: String },
        slug: { type: String },
        price: { type: Number },
        image: { type: String },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Customer || mongoose.model("Customer", CustomerSchema);
