const mongoose = require("mongoose");

/**
 * Vehicle model — powers the "Shop by Car" section and the
 * Make → Model → Year cascading filter (AutoJin-style).
 *
 * One document = one GENERATION of a car, e.g.:
 *   { make: "Honda", model: "Civic", generation: "Civic X", yearFrom: 2016, yearTo: 2021 }
 *
 * Products reference vehicles via `compatibleVehicles: [ObjectId]`
 * (universal products set `isUniversal: true` instead).
 */
const vehicleSchema = new mongoose.Schema(
  {
    make: { type: String, required: true, trim: true },        // Toyota, Honda, ...
    model: { type: String, required: true, trim: true },       // Corolla, Civic, ...
    generation: { type: String, default: "" },                 // "E170", "Civic X", "Rebirth"
    displayName: { type: String, required: true },             // "Toyota Corolla E170 (2014–2026)"

    yearFrom: { type: Number, required: true },
    yearTo: { type: Number, default: null },                   // null = present

    slug: { type: String, required: true, unique: true, lowercase: true },
    image: { type: String, default: "" },

    // SEO — every vehicle page gets a keyword-rich, unique title/description
    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },

    // Migration mapping back to Shopify
    shopifyHandle: { type: String, default: "" },
    shopifyId: { type: String, default: "" },

    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

vehicleSchema.index({ make: 1, model: 1, yearFrom: 1 });

/** Does a given year fall inside this generation's range? */
vehicleSchema.methods.matchesYear = function (year) {
  const to = this.yearTo || new Date().getFullYear() + 1;
  return year >= this.yearFrom && year <= to;
};

module.exports = mongoose.models.Vehicle || mongoose.model("Vehicle", vehicleSchema);
