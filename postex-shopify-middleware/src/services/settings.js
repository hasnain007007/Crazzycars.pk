"use strict";

/**
 * Runtime settings (AUTO_BOOK toggle, pickup code override) stored in AppSetting.
 */
const { prisma } = require("../utils/db");

async function getRuntimeSettings() {
  const row = await prisma.appSetting.findUnique({ where: { id: "singleton" } });
  let parsed = {};
  try {
    parsed = row?.value ? JSON.parse(row.value) : {};
  } catch {
    parsed = {};
  }
  const envAuto = String(process.env.AUTO_BOOK || "false").toLowerCase() === "true";
  return {
    autoBook: parsed.autoBook != null ? Boolean(parsed.autoBook) : envAuto,
    pickupAddressCode:
      parsed.pickupAddressCode ||
      process.env.POSTEX_PICKUP_ADDRESS_CODE ||
      "001",
  };
}

async function saveRuntimeSettings(patch) {
  const current = await getRuntimeSettings();
  const next = { ...current, ...patch };
  await prisma.appSetting.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", value: JSON.stringify(next) },
    update: { value: JSON.stringify(next) },
  });
  return next;
}

module.exports = { getRuntimeSettings, saveRuntimeSettings };
