"use strict";

const express = require("express");
const { requireAuth } = require("../middleware/requireAuth");
const { prisma } = require("../utils/db");
const { maskSecrets } = require("../utils/logger");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const logs = await prisma.apiLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const safe = logs.map((l) => ({
    ...l,
    requestBody: maskSecrets(l.requestBody),
    responseBody: maskSecrets(l.responseBody),
  }));
  res.render("logs/index", { title: "API Logs", logs: safe });
});

module.exports = router;
