"use strict";

/**
 * PostEx × Shopify middleware server
 */
require("dotenv").config();

const path = require("path");
const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const { logger } = require("./utils/logger");
const { startCronJobs } = require("./jobs/cron");
const { ensureCitiesFresh } = require("./services/cityMapper");
const { getInflightBookings } = require("./services/bookingEngine");
const { prisma } = require("./utils/db");

const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const ordersRoutes = require("./routes/orders");
const settingsRoutes = require("./routes/settings");
const logsRoutes = require("./routes/logs");
const webhookRoutes = require("./routes/webhooks");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === "production";
const sessionSecret = String(process.env.SESSION_SECRET || "").trim();

if (!sessionSecret || sessionSecret === "dev-only-change-me") {
  if (isProd) {
    throw new Error("SESSION_SECRET must be set to a strong unique value in production");
  }
  logger.warn("SESSION_SECRET missing or default — set a strong secret before production deploy");
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Webhooks MUST use raw body + HMAC before JSON parser
app.use("/webhooks", webhookRoutes);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: sessionSecret || "dev-only-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  res.locals.user = req.session.authenticated ? { name: process.env.ADMIN_USERNAME || "admin" } : null;
  next();
});

app.get("/", (req, res) => {
  if (req.session?.authenticated) return res.redirect("/dashboard");
  return res.redirect("/login");
});

app.use(authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/orders", ordersRoutes);
app.use("/settings", settingsRoutes);
app.use("/logs", logsRoutes);

app.get("/health", (req, res) => res.json({ ok: true }));

let server;
async function start() {
  if (!process.env.ADMIN_PASSWORD) {
    logger.warn("ADMIN_PASSWORD is empty — set it in .env before using the dashboard");
  }
  try {
    await ensureCitiesFresh();
  } catch (e) {
    logger.warn({ err: e.message }, "Initial city cache skipped (PostEx key may be missing)");
  }
  startCronJobs();
  server = app.listen(PORT, () => {
    logger.info(`PostEx×Shopify middleware listening on http://localhost:${PORT}`);
  });
}

async function waitForInflight(maxMs = 8000) {
  const start = Date.now();
  while (getInflightBookings() > 0 && Date.now() - start < maxMs) {
    logger.info({ inflight: getInflightBookings() }, "Waiting for in-flight bookings…");
    await new Promise((r) => setTimeout(r, 250));
  }
}

function shutdown(signal) {
  logger.info({ signal }, "Shutting down…");
  const finish = async () => {
    await waitForInflight();
    try {
      await prisma.$disconnect();
    } catch {
      /* ignore */
    }
    process.exit(0);
  };
  if (server) {
    server.close(() => {
      logger.info("HTTP server closed");
      finish();
    });
    setTimeout(() => process.exit(1), 12000).unref();
  } else {
    finish();
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start().catch((e) => {
  logger.error(e);
  process.exit(1);
});
