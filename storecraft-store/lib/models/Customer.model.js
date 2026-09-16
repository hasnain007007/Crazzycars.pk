import mongoose from "mongoose";

const addressSubSchema = new mongoose.Schema(
  {
    label: { type: String, default: "Home" },
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    phone: { type: String, default: "" },
    street: { type: String, default: "" },
    /** @deprecated use street — kept for older address-book rows */
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
    /** Canonical PK mobile 03XXXXXXXXX — unique when non-empty (partial index). */
    phone: { type: String, default: "", trim: true },
    avatar: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    lastLogin: { type: Date },
    /** Legacy singular address (kept in sync with default book entry). */
    address: {
      street: { type: String, default: "" },
      street2: { type: String, default: "" },
      area: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      country: { type: String, default: "Pakistan" },
      zip: { type: String, default: "" },
    },
    addresses: { type: [addressSubSchema], default: [] },
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

CustomerSchema.index(
  { phone: 1 },
  {
    unique: true,
    name: "phone_unique_nonzero",
    partialFilterExpression: { phone: { $type: "string", $gt: "" } },
  }
);

export default mongoose.models.Customer || mongoose.model("Customer", CustomerSchema);
