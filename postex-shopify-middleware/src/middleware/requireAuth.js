"use strict";

function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  if (req.accepts("html")) return res.redirect("/login");
  return res.status(401).json({ ok: false, error: "Unauthorized" });
}

module.exports = { requireAuth };
