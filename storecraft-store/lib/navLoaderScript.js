/**
 * Instant navigation feedback — inlined into <body> (no React, no extra request), so it
 * works on the very first tap, even before hydration.
 *
 * Product cards are plain <a href> (crawler-first), so a tap is a full page load and the
 * browser just keeps showing the old page until the new one paints. On slow mobile data
 * that felt like "nothing happens". This script:
 *   1. marks the tapped card (pressed state) and starts a thin red progress bar (~80ms),
 *   2. after ~260ms, covers the content area (header stays visible) with a skeleton of
 *      the DESTINATION — product page (with the tapped photo already in place), product
 *      grid, or a small driving-car loader for other pages,
 *   3. removes everything when the new page shows (full load), when the URL changes
 *      (Next <Link> client navigation), on bfcache restore, or after a safety timeout.
 * It ignores add-to-cart / wishlist buttons inside cards, swipes, new tabs, downloads,
 * hash links, other sites, and same-URL taps. Honors prefers-reduced-motion.
 *
 * Network-adaptive (sets <html data-net="slow|ok|fast"> and data-lite="1" before paint):
 *   FAST (4G, low latency): Speculation Rules PREFETCH of internal pages on hover / touch
 *     intent, so most taps open instantly (prefetch never runs page JS → no fake
 *     pixel/GA hits; server AI-traffic logging already skips Sec-Purpose: prefetch).
 *   SLOW (2G/3G, Data Saver, high RTT) or LOW-END phone (≤2GB RAM / ≤2 cores):
 *     no prefetch (saves the customer's data), skeleton appears sooner (120ms), a calm
 *     English + Urdu "slow internet, still loading" note after 3.5s, and the motion
 *     layer / hero autoplay switch to lite mode (see MotionEffects, HomeHero).
 *   OFFLINE: taps on links show "No internet" instead of the browser error page, and a
 *     banner says when the connection is back.
 *   Measured, not only reported: phones often say "4g" on a congested tower, and iOS has
 *   no Network Information API at all. So after every load we also check this page's own
 *   timing (slow TTFB / download ⇒ slow), and a tap that takes >3.5s marks the network
 *   slow too. The verdict is remembered for the visit (sessionStorage) so the NEXT page
 *   starts in lite mode at once; a clearly fast load clears it.
 *
 * Written as a plain function and stringified: keep it ES2015-simple (no imports,
 * no helpers) so the inlined source runs as-is.
 */
function ccNavLoader() {
  if (window.__ccNav) return;
  window.__ccNav = 1;
  var d = document;
  var STATIC = /^\/(about|about-us|account|account-deletion|advance-payment|blog|blogs|cars|cart|cash-on-delivery|categories|checkout|city|collections|compare|contact|faq|feed|founder|order-confirmation|pages|posts|products|returns-policy|review|sale|search|shipping-policy|shop|track-order|wishlist)(\/|$)/;
  var GRID = /^\/(shop|sale|categories|cars|collections|city|products)(\/|$)/;
  var CARD = ".product-card,.pl-row,[data-product-card]";
  var html = d.documentElement;
  var net = "ok";
  var specDone = 0;
  function learned(v) {
    try {
      if (v === undefined) return sessionStorage.getItem("cc-net") || "";
      if (v) sessionStorage.setItem("cc-net", v);
      else sessionStorage.removeItem("cc-net");
    } catch (err) {}
    return "";
  }
  function profile() {
    var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    var slow = learned() === "slow", fast = false;
    if (c) {
      var et = String(c.effectiveType || "");
      // effectiveType / RTT / Data Saver are the reliable signals; Chrome's downlink
      // estimate is noisy, so only its extremes count.
      slow = slow || !!c.saveData || (et && et !== "4g") || c.rtt > 700 || (c.downlink > 0 && c.downlink < 0.4);
      fast = !slow && et === "4g" && !(c.rtt > 350) && !(c.downlink > 0 && c.downlink < 1.5);
    }
    var lowEnd = (navigator.deviceMemory > 0 && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 2);
    setNet(slow ? "slow" : fast ? "fast" : "ok", slow || lowEnd);
  }
  function setNet(n, lite) {
    net = n;
    html.setAttribute("data-net", n);
    if (lite) html.setAttribute("data-lite", "1");
    else html.removeAttribute("data-lite");
    speculate();
  }
  function speculate() {
    if (net !== "fast" || specDone) return;
    if (!(window.HTMLScriptElement && HTMLScriptElement.supports && HTMLScriptElement.supports("speculationrules"))) return;
    specDone = 1;
    var s = d.createElement("script");
    s.type = "speculationrules";
    s.id = "cc-speculation";
    s.textContent = JSON.stringify({
      prefetch: [
        {
          source: "document",
          where: {
            and: [
              { href_matches: "/*" },
              { not: { href_matches: ["/api/*", "/admin*", "/account*", "/checkout*", "/cart*", "/order-confirmation*", "/wishlist*", "/_next/*"] } },
              { not: { selector_matches: "[href*='?'],[rel~=nofollow],[target=_blank],[download],[data-no-prefetch]" } },
            ],
          },
          eagerness: "moderate",
        },
      ],
    });
    (d.head || html).appendChild(s);
  }
  profile();
  var conn = navigator.connection;
  if (conn && conn.addEventListener) conn.addEventListener("change", profile);
  // Everyone: confirm with this page's real load timing.
  addEventListener("load", function () {
    setTimeout(function () {
      var t = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
      if (!t || !(t.responseStart > 0)) return;
      var ttfb = t.responseStart - t.requestStart;
      var dl = t.responseEnd - t.responseStart;
      if (ttfb > 2500 || dl > 2500) {
        learned("slow");
        setNet("slow", true);
      } else if (ttfb < 400 && dl < 600) {
        if (learned() === "slow") {
          learned("");
          profile();
        } else if (!conn && net !== "slow") {
          setNet("fast", html.getAttribute("data-lite") === "1");
        }
      }
    }, 0);
  });

  var CSS =
    "#ccnav-bar{position:fixed;top:0;left:0;height:3px;width:0;z-index:7100;background:linear-gradient(90deg,#C41E1E,#ff5a4f);box-shadow:0 0 10px rgba(196,30,30,.55);border-radius:0 3px 3px 0;pointer-events:none;transition:width 8s cubic-bezier(.1,.7,.2,1),opacity .3s}" +
    "#ccnav-bar.go{width:86%}#ccnav-bar.done{width:100%;transition:width .2s,opacity .3s .15s;opacity:0}" +
    ".ccnav-pressed{transition:transform .15s,opacity .15s!important;transform:scale(.97)!important;opacity:.75}" +
    "#ccnav-ov{position:fixed;left:0;right:0;bottom:0;z-index:6900;background:var(--color-background,#fff);overflow:hidden;opacity:0;transition:opacity .18s}" +
    "#ccnav-ov.on{opacity:1}" +
    ".ccnav-in{max-width:1280px;margin:0 auto;padding:20px 16px}" +
    ".ccnav-sk{display:block;height:14px;border-radius:8px;margin:0 0 12px;background:linear-gradient(90deg,#eef0f3 25%,#f8f9fb 50%,#eef0f3 75%);background-size:200% 100%;animation:ccnav-sh 1.1s linear infinite}" +
    "@keyframes ccnav-sh{from{background-position:200% 0}to{background-position:-200% 0}}" +
    ".ccnav-pdp{display:grid;gap:22px}@media(min-width:768px){.ccnav-pdp{grid-template-columns:1fr 1fr;gap:40px;padding-top:28px}}" +
    ".ccnav-gal{position:relative;aspect-ratio:1/1;border-radius:16px;overflow:hidden;background:#f3f4f6;max-height:60vh}" +
    ".ccnav-gal img{width:100%;height:100%;object-fit:contain;animation:ccnav-zoom .45s cubic-bezier(.2,.8,.2,1)}" +
    "@keyframes ccnav-zoom{from{transform:scale(.9);opacity:.4}to{transform:none;opacity:1}}" +
    ".ccnav-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}@media(min-width:768px){.ccnav-grid{grid-template-columns:repeat(4,1fr);gap:18px}}" +
    ".ccnav-card .ccnav-sk:first-child{height:auto;aspect-ratio:1/1;border-radius:12px}" +
    ".ccnav-page{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:50vh;gap:14px;color:#6b7280;font:600 13px/1.4 system-ui,sans-serif;letter-spacing:.04em}" +
    ".ccnav-car{width:132px;height:64px;overflow:visible}" +
    ".ccnav-car .b{animation:ccnav-bob .5s ease-in-out infinite alternate}" +
    ".ccnav-car .w{transform-box:fill-box;transform-origin:center;animation:ccnav-spin .5s linear infinite}" +
    ".ccnav-car .r{stroke-dasharray:14 12;animation:ccnav-road .45s linear infinite}" +
    "@keyframes ccnav-bob{to{transform:translateY(-1.5px)}}@keyframes ccnav-spin{to{transform:rotate(360deg)}}@keyframes ccnav-road{to{stroke-dashoffset:26}}" +
    ".ccnav-slow{position:absolute;top:14px;left:16px;right:16px;z-index:2;max-width:420px;margin:0 auto;box-shadow:0 8px 24px rgba(154,52,18,.15);padding:12px 16px;border-radius:12px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;font:600 13px/1.5 system-ui,sans-serif;text-align:center;animation:ccnav-up .3s ease both}" +
    ".ccnav-slow span{display:block;font-weight:500;margin-top:2px}" +
    "@keyframes ccnav-up{from{opacity:0;transform:translateY(8px)}}" +
    "#ccnav-net{position:fixed;left:50%;bottom:calc(72px + env(safe-area-inset-bottom,0px));z-index:7200;transform:translateX(-50%);max-width:calc(100vw - 32px);padding:10px 16px;border-radius:999px;background:#111;color:#fff;font:600 13px/1.3 system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.3);animation:ccnav-up .25s ease both;text-align:center}" +
    "#ccnav-net.ok{background:#15803d}" +
    "@media (prefers-reduced-motion:reduce){.ccnav-sk,.ccnav-car *,.ccnav-gal img{animation:none!important}#ccnav-bar{transition:none}}";

  var bar = null, ov = null, pressed = null, tBar = 0, tOv = 0, tSlow = 0, tMax = 0, poll = 0, from = "", downX = 0, downY = 0, tNet = 0;

  function netBanner(text, ok) {
    css();
    var b = d.getElementById("ccnav-net");
    if (!b) {
      b = d.createElement("div");
      b.id = "ccnav-net";
      b.setAttribute("role", "status");
      b.setAttribute("aria-live", "polite");
      d.body.appendChild(b);
    }
    b.className = ok ? "ok" : "";
    b.textContent = text;
    clearTimeout(tNet);
    tNet = setTimeout(function () { b.remove(); }, ok ? 2500 : 6000);
  }
  var OFFLINE = "No internet — check your data or Wi-Fi";
  addEventListener("offline", function () { stop(); netBanner(OFFLINE, false); });
  addEventListener("online", function () { netBanner("Back online ✓", true); profile(); });

  function css() {
    if (d.getElementById("ccnav-css")) return;
    var s = d.createElement("style");
    s.id = "ccnav-css";
    s.textContent = CSS;
    (d.head || d.documentElement).appendChild(s);
  }
  function sk(cls) {
    return '<i class="ccnav-sk" style="' + cls + '"></i>';
  }
  function headerBottom() {
    var h = d.querySelector(".store-site-header") || d.querySelector("header");
    if (!h) return 0;
    var b = h.getBoundingClientRect().bottom;
    return b > 0 && b < 200 ? Math.round(b) : 0;
  }
  function build(kind, img) {
    var html;
    if (kind === "product") {
      html =
        '<div class="ccnav-in ccnav-pdp"><div class="ccnav-gal"></div><div>' +
        sk("width:30%") + sk("height:26px;width:92%") + sk("height:26px;width:66%;margin-bottom:22px") +
        sk("height:30px;width:38%;margin-bottom:22px") + sk("width:100%") + sk("width:94%") + sk("width:78%;margin-bottom:24px") +
        sk("height:48px;width:100%;border-radius:12px") + sk("height:48px;width:100%;border-radius:12px") +
        "</div></div>";
    } else if (kind === "grid") {
      var cards = "";
      for (var i = 0; i < 8; i++) {
        cards += '<div class="ccnav-card">' + sk("") + sk("width:90%") + sk("width:55%") + sk("height:18px;width:40%") + "</div>";
      }
      html = '<div class="ccnav-in">' + sk("height:24px;width:40%;max-width:320px;margin-bottom:8px") + sk("width:24%;max-width:180px;margin-bottom:22px") + '<div class="ccnav-grid">' + cards + "</div></div>";
    } else {
      html =
        '<div class="ccnav-in ccnav-page"><svg class="ccnav-car" viewBox="0 0 132 64" aria-hidden="true">' +
        '<line class="r" x1="0" y1="60" x2="132" y2="60" stroke="#d1d5db" stroke-width="3" stroke-linecap="round"/>' +
        '<g class="b"><path d="M22 44c0-6 3-9 9-10l12-3 11-10c3-2 6-3 10-3h20c4 0 7 1 10 4l9 9 9 2c5 1 8 5 8 10v4c0 2-2 4-4 4H26c-2 0-4-2-4-4z" fill="#C41E1E"/>' +
        '<path d="M58 23c2-2 4-3 7-3h7v12H49zM76 20h7c3 0 5 1 7 3l8 9H76z" fill="#fde2e2"/>' +
        '<rect x="106" y="40" width="7" height="4" rx="2" fill="#ffd36b"/></g>' +
        '<g class="w"><circle cx="44" cy="50" r="8" fill="#111"/><circle cx="44" cy="50" r="3" fill="#e5e7eb"/><rect x="43" y="43" width="2" height="4" fill="#e5e7eb"/></g>' +
        '<g class="w"><circle cx="98" cy="50" r="8" fill="#111"/><circle cx="98" cy="50" r="3" fill="#e5e7eb"/><rect x="97" y="43" width="2" height="4" fill="#e5e7eb"/></g>' +
        "</svg><span>Loading…</span></div>";
    }
    var el = d.createElement("div");
    el.id = "ccnav-ov";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = html;
    if (img) {
      var gal = el.querySelector(".ccnav-gal");
      if (gal) {
        var im = d.createElement("img");
        im.alt = "";
        im.src = img;
        gal.appendChild(im);
      }
    }
    return el;
  }
  function stop() {
    clearTimeout(tBar); clearTimeout(tOv); clearTimeout(tSlow); clearTimeout(tMax); clearInterval(poll);
    if (pressed) { pressed.classList.remove("ccnav-pressed"); pressed = null; }
    if (ov) { var o = ov; ov = null; o.classList.remove("on"); setTimeout(function () { o.remove(); }, 200); }
    if (bar) { var b = bar; bar = null; b.classList.add("done"); setTimeout(function () { b.remove(); }, 450); }
    d.documentElement.removeAttribute("aria-busy");
  }
  function start(kind, img, card, client) {
    stop();
    css();
    from = location.href;
    if (card) { pressed = card; card.classList.add("ccnav-pressed"); }
    d.documentElement.setAttribute("aria-busy", "true");
    tBar = setTimeout(function () {
      bar = d.createElement("div");
      bar.id = "ccnav-bar";
      d.body.appendChild(bar);
      requestAnimationFrame(function () { requestAnimationFrame(function () { if (bar) bar.classList.add("go"); }); });
    }, 80);
    tOv = setTimeout(function () {
      if (pressed) { pressed.classList.remove("ccnav-pressed"); pressed = null; }
      ov = build(kind, img);
      ov.style.top = headerBottom() + "px";
      d.body.appendChild(ov);
      requestAnimationFrame(function () { if (ov) ov.classList.add("on"); });
    }, net === "slow" ? 120 : 260);
    tSlow = setTimeout(function () {
      learned("slow");
      if (net !== "slow") setNet("slow", true);
      if (!ov) return;
      var n = d.createElement("div");
      n.className = "ccnav-slow";
      n.innerHTML = 'Slow internet — still loading, please wait…<span lang="ur" dir="rtl">انٹرنیٹ سست ہے، صفحہ لوڈ ہو رہا ہے</span>';
      ov.appendChild(n);
    }, 3500);
    tMax = setTimeout(stop, client ? 9000 : 15000);
    if (client) {
      poll = setInterval(function () {
        if (location.href !== from) {
          clearInterval(poll);
          requestAnimationFrame(function () { requestAnimationFrame(stop); });
        }
      }, 60);
    }
  }
  function kindFor(url, a) {
    var p = url.pathname;
    if (a && a.closest && a.closest(CARD)) return "product";
    if (GRID.test(p)) return "grid";
    if (p !== "/" && p.split("/").length === 2 && !STATIC.test(p)) return "product";
    return "page";
  }
  function imgFrom(a) {
    var root = (a.closest && a.closest(CARD)) || a;
    var im = root.querySelector("img");
    return im ? im.currentSrc || im.src || "" : "";
  }
  function go(url, a, client) {
    if (url.origin !== location.origin) return;
    if (!/^https?:$/.test(url.protocol)) return;
    var p = url.pathname;
    if (/^\/(api|admin|_next)\//.test(p) || /\.(pdf|jpe?g|png|webp|gif|zip|xml|txt|json)$/i.test(p)) return;
    if (p === location.pathname && url.search === location.search) return;
    var kind = kindFor(url, a);
    var card = a ? (a.closest && a.closest(CARD)) || a : null;
    start(kind, kind === "product" && a ? imgFrom(a) : "", card, client);
  }

  addEventListener("pointerdown", function (e) { downX = e.clientX; downY = e.clientY; }, true);
  // Offline: capture phase on window runs BEFORE React/Next <Link>, so stopping here keeps
  // the shopper on the page (with a message) instead of the browser's "no internet" screen.
  addEventListener("click", function (e) {
    if (navigator.onLine !== false || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest && e.target.closest("a[href]");
    if (!a || (a.target && a.target !== "_self")) return;
    var ctl = e.target.closest("button,input,select,textarea,label,[role=button]");
    if (ctl && a.contains(ctl)) return;
    var url;
    try { url = new URL(a.href, location.href); } catch (err) { return; }
    if (url.origin !== location.origin || url.href.split("#")[0] === location.href.split("#")[0]) return;
    e.preventDefault();
    e.stopPropagation();
    netBanner(OFFLINE, false);
  }, true);
  // window (not document) bubble phase: runs after React's root handlers, so
  // defaultPrevented reliably means "Next <Link> is handling this client-side".
  addEventListener("click", function (e) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var t = e.target;
    if (!t || !t.closest) return;
    var a = t.closest("a[href]");
    if (!a) return;
    var ctl = t.closest("button,input,select,textarea,label,[role=button]");
    if (ctl && a.contains(ctl)) return;
    if ((a.target && a.target !== "_self") || a.hasAttribute("download") || a.hasAttribute("data-no-loader")) return;
    if (Math.abs(e.clientX - downX) > 12 || Math.abs(e.clientY - downY) > 12) {
      if (e.clientX || e.clientY) return;
    }
    var url;
    try { url = new URL(a.href, location.href); } catch (err) { return; }
    if (e.defaultPrevented) {
      // Client navigation via <Link>; skip anchors that only toggle UI (no route change).
      go(url, a, true);
    } else {
      go(url, a, false);
    }
  });
  addEventListener("submit", function (e) {
    var f = e.target;
    if (e.defaultPrevented || !f || (f.method || "get").toLowerCase() !== "get") return;
    if (f.target && f.target !== "_self") return;
    var url;
    try { url = new URL(f.action || location.href, location.href); } catch (err) { return; }
    if (url.origin !== location.origin) return;
    start(GRID.test(url.pathname) ? "grid" : "page", "", null, false);
  });
  addEventListener("pageshow", stop);
  addEventListener("popstate", function () { setTimeout(stop, 50); });
  d.addEventListener("keydown", function (e) { if (e.key === "Escape") stop(); });
}

export const NAV_LOADER_SCRIPT = `(${ccNavLoader.toString()})();`;
