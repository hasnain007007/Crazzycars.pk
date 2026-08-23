"use strict";

const express = require("express");
const { requireAuth } = require("../middleware/requireAuth");
const { prisma } = require("../utils/db");
const bookingEngine = require("../services/bookingEngine");
const cityMapper = require("../services/cityMapper");
const postex = require("../services/postex");

const router = express.Router();
router.use(requireAuth);
router.use(express.urlencoded({ extended: true }));
router.use(express.json());

router.get("/", async (req, res) => {
  const { status, q, from, to } = req.query;
  const where = {};
  if (status && status !== "all") where.bookingStatus = String(status);
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(String(from));
    if (to) {
      const end = new Date(String(to));
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }
  if (q) {
    const term = String(q).trim();
    where.OR = [
      { shopifyOrderNumber: { contains: term } },
      { postexTrackingNumber: { contains: term } },
      { phone: { contains: term } },
      { customerName: { contains: term } },
    ];
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const cities = await prisma.postexCity.findMany({ orderBy: { name: "asc" } });
  const deliveryCities = cities.filter((c) => c.isDelivery);
  const ordersWithCityHelp = orders.map((o) => {
    if (o.mappedCity) {
      return { ...o, recommendedCity: "", recommendationReason: "" };
    }
    const rec = cityMapper.rankCityRecommendations(o.city, deliveryCities, 1)[0];
    return {
      ...o,
      recommendedCity: rec?.name || "",
      recommendationReason: rec?.reason || "",
    };
  });

  res.render("orders/index", {
    title: "Orders",
    orders: ordersWithCityHelp,
    cities,
    filters: { status: status || "all", q: q || "", from: from || "", to: to || "" },
  });
});

// Bulk routes MUST be registered before /:id or "bulk" is treated as an id
router.post("/bulk/book", async (req, res) => {
  const ids = [].concat(req.body.ids || req.body["ids[]"] || []).filter(Boolean);
  let ok = 0;
  let fail = 0;
  for (const id of ids) {
    const r = await bookingEngine.bookOrder(id);
    if (r.ok) ok += 1;
    else fail += 1;
  }
  req.session.flash = { type: "ok", message: `Booked ${ok}, failed ${fail}` };
  res.redirect("/orders");
});

router.post("/bulk/labels", async (req, res) => {
  const ids = [].concat(req.body.ids || req.body["ids[]"] || []).filter(Boolean);
  const orders = await prisma.order.findMany({
    where: { id: { in: ids }, postexTrackingNumber: { not: null } },
  });
  const tns = orders.map((o) => o.postexTrackingNumber).filter(Boolean);
  if (!tns.length) {
    req.session.flash = { type: "err", message: "No tracking numbers selected" };
    return res.redirect("/orders");
  }
  const bill = await postex.getAirwayBill(tns);
  if (!bill.ok || !bill.data) {
    req.session.flash = { type: "err", message: bill.error || "Labels failed" };
    return res.redirect("/orders");
  }
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="postex-labels.pdf"`);
  res.send(bill.data);
});

router.get("/:id", async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) return res.status(404).send("Not found");
  let history = [];
  try {
    history = JSON.parse(order.postexStatusHistory || "[]");
  } catch {
    history = [];
  }
  const logs = await prisma.apiLog.findMany({
    where: {
      OR: [
        { requestBody: { contains: order.shopifyOrderNumber } },
        { responseBody: { contains: order.postexTrackingNumber || "___none___" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const cities = await prisma.postexCity.findMany({ orderBy: { name: "asc" } });
  res.render("orders/detail", { title: `Order ${order.shopifyOrderNumber}`, order, history, logs, cities });
});

router.post("/:id/book", async (req, res) => {
  const result = await bookingEngine.bookOrder(req.params.id);
  if (req.headers.accept?.includes("application/json")) {
    return res.json(result);
  }
  req.session.flash = result.ok
    ? { type: "ok", message: `Booked: ${result.trackingNumber || "OK"}` }
    : { type: "err", message: result.error || "Booking failed" };
  res.redirect(`/orders/${req.params.id}`);
});

router.post("/:id/retry", async (req, res) => {
  await prisma.order.update({
    where: { id: req.params.id },
    data: { bookingStatus: "PENDING_BOOKING", lastError: "", nextRetryAt: null },
  });
  const result = await bookingEngine.bookOrder(req.params.id);
  req.session.flash = result.ok
    ? { type: "ok", message: `Booked: ${result.trackingNumber}` }
    : { type: "err", message: result.error || "Retry failed" };
  res.redirect(`/orders/${req.params.id}`);
});

router.post("/:id/fix-city", async (req, res) => {
  const postexCityName = String(req.body.postexCityName || "").trim();
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order || !postexCityName) return res.redirect("/orders");
  await cityMapper.saveCityMapping(order.city, postexCityName);
  await prisma.order.update({
    where: { id: order.id },
    data: {
      mappedCity: postexCityName,
      bookingStatus: "PENDING_BOOKING",
      lastError: "",
    },
  });
  const result = await bookingEngine.bookOrder(order.id);
  req.session.flash = result.ok
    ? { type: "ok", message: `City fixed & booked: ${result.trackingNumber}` }
    : { type: "err", message: result.error || "Book after city fix failed" };
  res.redirect(`/orders/${order.id}`);
});

router.post("/:id/cancel", async (req, res) => {
  const result = await bookingEngine.cancelBookedOrder(req.params.id);
  req.session.flash = result.ok
    ? { type: "ok", message: "Cancelled" }
    : { type: "err", message: result.error || "Cancel failed" };
  res.redirect(`/orders/${req.params.id}`);
});

router.get("/:id/label", async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order?.postexTrackingNumber) return res.status(400).send("No tracking number");
  const bill = await postex.getAirwayBill([order.postexTrackingNumber]);
  if (!bill.ok || !bill.data) return res.status(502).send(bill.error || "Label failed");
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="postex-${order.postexTrackingNumber}.pdf"`
  );
  res.send(bill.data);
});

module.exports = router;
