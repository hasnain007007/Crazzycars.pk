const express = require("express");
const router = express.Router();
const Vehicle = require("../models/Vehicle");

/**
 * GET /api/vehicles/makes
 * → ["Haval","Honda","Hyundai","Suzuki","Toyota"]  (for the first dropdown)
 */
router.get("/makes", async (req, res) => {
  try {
    const makes = await Vehicle.distinct("make", { isActive: true });
    res.json(makes.sort());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/vehicles/models?make=Honda
 * → ["City","Civic"]  (second dropdown)
 */
router.get("/models", async (req, res) => {
  try {
    const { make } = req.query;
    if (!make) return res.status(400).json({ message: "make is required" });
    const models = await Vehicle.distinct("model", { make, isActive: true });
    res.json(models.sort());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/vehicles/generations?make=Honda&model=Civic
 * → all generations with year ranges (third dropdown / year matching)
 */
router.get("/generations", async (req, res) => {
  try {
    const { make, model } = req.query;
    if (!make || !model)
      return res.status(400).json({ message: "make and model are required" });
    const gens = await Vehicle.find({ make, model, isActive: true })
      .sort({ yearFrom: 1 })
      .lean();
    res.json(gens);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/vehicles/find?make=Honda&model=Civic&year=2018
 * → resolves a specific year to its generation (Civic X 2016–2021).
 *   Frontend then loads products where compatibleVehicles includes this id
 *   OR isUniversal is true.
 */
router.get("/find", async (req, res) => {
  try {
    const { make, model, year } = req.query;
    const y = parseInt(year, 10);
    if (!make || !model || !y)
      return res.status(400).json({ message: "make, model and year are required" });

    const candidates = await Vehicle.find({ make, model, isActive: true }).lean();
    const now = new Date().getFullYear() + 1;
    const match = candidates.find(
      (v) => y >= v.yearFrom && y <= (v.yearTo || now)
    );
    if (!match) return res.status(404).json({ message: "No matching generation" });
    res.json(match);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/vehicles           → full list (for "Shop By Your Vehicle" grid)
 * GET /api/vehicles/:slug     → single vehicle page (SEO landing)
 */
router.get("/", async (req, res) => {
  try {
    const list = await Vehicle.find({ isActive: true })
      .sort({ make: 1, sortOrder: 1 })
      .lean();
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:slug", async (req, res) => {
  try {
    const v = await Vehicle.findOne({ slug: req.params.slug, isActive: true }).lean();
    if (!v) return res.status(404).json({ message: "Vehicle not found" });
    res.json(v);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
