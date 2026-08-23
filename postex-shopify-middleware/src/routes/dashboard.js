"use strict";

const express = require("express");
const { requireAuth } = require("../middleware/requireAuth");
const { prisma } = require("../utils/db");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const [
    todayCount,
    pending,
    booked,
    delivered,
    returned,
    failed,
    recent,
  ] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: start } } }),
    prisma.order.count({ where: { bookingStatus: "PENDING_BOOKING" } }),
    prisma.order.count({ where: { bookingStatus: "BOOKED" } }),
    prisma.order.count({ where: { bookingStatus: "DELIVERED" } }),
    prisma.order.count({ where: { bookingStatus: "RETURNED" } }),
    prisma.order.count({ where: { bookingStatus: "BOOKING_FAILED" } }),
    prisma.order.findMany({ orderBy: { updatedAt: "desc" }, take: 12 }),
  ]);

  // In transit ≈ booked but not delivered (postex status not empty / not Booked only)
  const inTransit = await prisma.order.count({
    where: {
      bookingStatus: "BOOKED",
      NOT: { postexStatus: { in: ["", "Booked", "Unbooked"] } },
    },
  });

  res.render("dashboard", {
    title: "Dashboard",
    stats: {
      todayCount,
      pending,
      booked,
      inTransit,
      delivered,
      returned,
      failed,
    },
    recent,
  });
});

module.exports = router;
