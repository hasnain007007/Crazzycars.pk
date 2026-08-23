"use strict";

/**
 * Shared logger — Pino. Secrets are masked before logging.
 */
const pino = require("pino");

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV === "production"
      ? undefined
      : {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard" },
        },
});

function maskSecrets(value) {
  if (value == null) return value;
  const str = typeof value === "string" ? value : JSON.stringify(value);
  return str
    .replace(/(token["']?\s*[:=]\s*["']?)([^"',\s}]+)/gi, "$1***")
    .replace(/(Bearer\s+)[^\s"']+/gi, "$1***")
    .replace(/(shpat_[a-zA-Z0-9]+)/g, "shpat_***")
    .replace(/(X-Shopify-Access-Token["']?\s*[:=]\s*["']?)([^"',\s}]+)/gi, "$1***");
}

module.exports = { logger, maskSecrets };
