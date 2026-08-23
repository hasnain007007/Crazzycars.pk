"use strict";

const express = require("express");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

router.get("/login", (req, res) => {
  if (req.session?.authenticated) return res.redirect("/dashboard");
  res.render("auth/login", { title: "Login", error: null });
});

router.post("/login", express.urlencoded({ extended: false }), (req, res) => {
  const user = String(process.env.ADMIN_USERNAME || "admin");
  const pass = String(process.env.ADMIN_PASSWORD || "");
  if (!pass) {
    return res.render("auth/login", {
      title: "Login",
      error: "Set ADMIN_PASSWORD in .env before logging in.",
    });
  }
  if (req.body.username === user && req.body.password === pass) {
    req.session.authenticated = true;
    return res.redirect("/dashboard");
  }
  return res.render("auth/login", { title: "Login", error: "Invalid username or password" });
});

router.post("/logout", requireAuth, (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

module.exports = router;
