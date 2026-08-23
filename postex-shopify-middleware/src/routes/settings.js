"use strict";

const express = require("express");
const { requireAuth } = require("../middleware/requireAuth");
const { getRuntimeSettings, saveRuntimeSettings } = require("../services/settings");
const cityMapper = require("../services/cityMapper");
const { prisma } = require("../utils/db");

const router = express.Router();
router.use(requireAuth);
router.use(express.urlencoded({ extended: true }));

router.get("/", async (req, res) => {
  const settings = await getRuntimeSettings();
  const mappings = await prisma.cityMapping.findMany({ orderBy: { shopifyCityRaw: "asc" } });
  const cities = await prisma.postexCity.findMany({ orderBy: { name: "asc" } });
  res.render("settings/index", {
    title: "Settings",
    settings,
    mappings,
    cities,
    cityCount: cities.length,
  });
});

router.post("/", async (req, res) => {
  await saveRuntimeSettings({
    autoBook: req.body.autoBook === "on" || req.body.autoBook === "true",
    pickupAddressCode: String(req.body.pickupAddressCode || "").trim(),
  });
  req.session.flash = { type: "ok", message: "Settings saved" };
  res.redirect("/settings");
});

router.post("/refresh-cities", async (req, res) => {
  const result = await cityMapper.refreshCityCache();
  req.session.flash = result.ok
    ? { type: "ok", message: `Cities refreshed (${result.count})` }
    : { type: "err", message: result.error || "Refresh failed" };
  res.redirect("/settings");
});

router.post("/mappings", async (req, res) => {
  const raw = String(req.body.shopifyCityRaw || "").trim();
  const city = String(req.body.postexCityName || "").trim();
  if (raw && city) await cityMapper.saveCityMapping(raw, city);
  req.session.flash = { type: "ok", message: "Mapping saved" };
  res.redirect("/settings");
});

router.post("/mappings/:id/delete", async (req, res) => {
  await prisma.cityMapping.delete({ where: { id: req.params.id } }).catch(() => null);
  res.redirect("/settings");
});

module.exports = router;
