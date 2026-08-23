"use strict";

const cron = require("node-cron");
const { runPollerCycle } = require("../services/poller");
const { refreshCityCache } = require("../services/cityMapper");
const { logger } = require("../utils/logger");

function startCronJobs() {
  const minutes = Math.max(5, Number(process.env.POLL_INTERVAL_MINUTES) || 45);

  // Poller + retry queue
  cron.schedule(`*/${minutes} * * * *`, async () => {
    try {
      await runPollerCycle();
    } catch (e) {
      logger.error({ err: e.message }, "Poller cron failed");
    }
  });

  // Refresh PostEx cities once a day at 03:15
  cron.schedule("15 3 * * *", async () => {
    try {
      await refreshCityCache();
    } catch (e) {
      logger.error({ err: e.message }, "City refresh cron failed");
    }
  });

  logger.info({ minutes }, "Cron jobs scheduled");
}

module.exports = { startCronJobs };
