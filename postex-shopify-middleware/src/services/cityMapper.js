"use strict";

/**
 * City matching: normalize Shopify free-text cities → PostEx operational cities.
 */
const { prisma } = require("../utils/db");
const postex = require("./postex");
const { logger } = require("../utils/logger");

function normalizeCityKey(raw) {
  return String(raw || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeCityKey(raw) {
  return normalizeCityKey(raw)
    .split(" ")
    .map((t) => t.trim())
    .filter(Boolean);
}

function scoreCandidate(shopifyKey, postexName) {
  const candidateKey = normalizeCityKey(postexName);
  if (!shopifyKey || !candidateKey) return { score: 0, reason: "" };
  if (candidateKey === shopifyKey) return { score: 100, reason: "EXACT" };
  if (candidateKey.startsWith(shopifyKey) || shopifyKey.startsWith(candidateKey)) {
    return { score: 90, reason: "PREFIX" };
  }
  if (candidateKey.includes(shopifyKey) || shopifyKey.includes(candidateKey)) {
    return { score: 80, reason: "CONTAINS" };
  }
  const a = new Set(tokenizeCityKey(shopifyKey));
  const b = new Set(tokenizeCityKey(candidateKey));
  const intersection = [...a].filter((x) => b.has(x)).length;
  if (!intersection) return { score: 0, reason: "" };
  const union = new Set([...a, ...b]).size || 1;
  const ratio = intersection / union;
  return { score: Math.round(ratio * 70), reason: "TOKEN_OVERLAP" };
}

function rankCityRecommendations(shopifyCityRaw, cities, limit = 3) {
  const shopifyKey = normalizeCityKey(shopifyCityRaw);
  if (!shopifyKey) return [];
  return (cities || [])
    .map((c) => {
      const scoreMeta = scoreCandidate(shopifyKey, c.name);
      return { name: c.name, score: scoreMeta.score, reason: scoreMeta.reason };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, Math.max(1, Number(limit) || 3));
}

async function refreshCityCache() {
  const result = await postex.getOperationalCities();
  if (!result.ok) {
    logger.warn({ error: result.error }, "Could not refresh PostEx cities");
    return result;
  }
  const cities = result.data || [];
  for (const c of cities) {
    await prisma.postexCity.upsert({
      where: { name: c.name },
      create: { name: c.name, isPickup: c.isPickup, isDelivery: c.isDelivery },
      update: { isPickup: c.isPickup, isDelivery: c.isDelivery },
    });
  }
  logger.info({ count: cities.length }, "PostEx city cache refreshed");
  return { ok: true, count: cities.length };
}

async function ensureCitiesFresh() {
  const newest = await prisma.postexCity.findFirst({ orderBy: { updatedAt: "desc" } });
  const staleMs = 24 * 60 * 60 * 1000;
  if (!newest || Date.now() - newest.updatedAt.getTime() > staleMs) {
    await refreshCityCache();
  }
}

/**
 * Resolve Shopify city string to a PostEx city name.
 * Returns { ok, cityName, reason }.
 */
async function resolveCity(shopifyCityRaw) {
  await ensureCitiesFresh();
  const raw = String(shopifyCityRaw || "").trim();
  const key = normalizeCityKey(raw);
  if (!key) return { ok: false, cityName: "", reason: "CITY_EMPTY" };

  // Manual mapping first
  const mapped = await prisma.cityMapping.findUnique({ where: { shopifyCityRaw: key } });
  if (mapped) return { ok: true, cityName: mapped.postexCityName, reason: "MAPPING" };

  // Also try original casing key
  const mappedRaw = await prisma.cityMapping.findUnique({ where: { shopifyCityRaw: raw } });
  if (mappedRaw) return { ok: true, cityName: mappedRaw.postexCityName, reason: "MAPPING" };

  const cities = await prisma.postexCity.findMany({ where: { isDelivery: true } });
  if (!cities.length) return { ok: false, cityName: "", reason: "CITY_CACHE_EMPTY" };

  // Exact (case-insensitive)
  const exact = cities.find((c) => normalizeCityKey(c.name) === key);
  if (exact) return { ok: true, cityName: exact.name, reason: "EXACT" };

  // Contains fuzzy
  const contains = cities.find(
    (c) =>
      normalizeCityKey(c.name).includes(key) ||
      key.includes(normalizeCityKey(c.name))
  );
  if (contains && key.length >= 3) {
    return { ok: true, cityName: contains.name, reason: "FUZZY" };
  }

  // Common aliases
  const ALIASES = {
    lhr: "Lahore",
    khi: "Karachi",
    isb: "Islamabad",
    rwp: "Rawalpindi",
    fsd: "Faisalabad",
    "lahore city": "Lahore",
  };
  if (ALIASES[key]) {
    const hit = cities.find((c) => normalizeCityKey(c.name) === normalizeCityKey(ALIASES[key]));
    if (hit) return { ok: true, cityName: hit.name, reason: "ALIAS" };
  }

  return { ok: false, cityName: "", reason: "CITY_MISMATCH" };
}

async function saveCityMapping(shopifyCityRaw, postexCityName) {
  const key = normalizeCityKey(shopifyCityRaw) || String(shopifyCityRaw || "").trim();
  return prisma.cityMapping.upsert({
    where: { shopifyCityRaw: key },
    create: { shopifyCityRaw: key, postexCityName },
    update: { postexCityName },
  });
}

async function recommendCities(shopifyCityRaw, limit = 3) {
  await ensureCitiesFresh();
  const cities = await prisma.postexCity.findMany({ where: { isDelivery: true } });
  return rankCityRecommendations(shopifyCityRaw, cities, limit);
}

module.exports = {
  normalizeCityKey,
  rankCityRecommendations,
  refreshCityCache,
  ensureCitiesFresh,
  resolveCity,
  recommendCities,
  saveCityMapping,
};
