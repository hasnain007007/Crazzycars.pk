/**
 * Motion / perceived-speed UX: instant tap loader, empty-state art, order delivery scene.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { NAV_LOADER_SCRIPT } from "../storecraft-store/lib/navLoaderScript.js";

const read = (p) => readFileSync(new URL(`../storecraft-store/${p}`, import.meta.url), "utf8");

test("nav loader is a self-contained, parseable inline script", () => {
  assert.doesNotThrow(() => new Function(NAV_LOADER_SCRIPT));
  assert.match(NAV_LOADER_SCRIPT, /^\(function ccNavLoader\(\)/);
  assert.doesNotMatch(NAV_LOADER_SCRIPT, /\bimport\b|\brequire\(/);
  // Window bubble phase so Next <Link> preventDefault is visible.
  assert.match(NAV_LOADER_SCRIPT, /addEventListener\("click"/);
  // Never fires for add-to-cart / wishlist buttons inside cards, new tabs, other sites.
  assert.match(NAV_LOADER_SCRIPT, /button,input,select,textarea,label,\[role=button\]/);
  assert.match(NAV_LOADER_SCRIPT, /a\.target !== "_self"/);
  assert.match(NAV_LOADER_SCRIPT, /url\.origin !== location\.origin/);
  // Always cleans up (bfcache back, safety timeout) and respects reduced motion.
  assert.match(NAV_LOADER_SCRIPT, /addEventListener\("pageshow", stop\)/);
  assert.match(NAV_LOADER_SCRIPT, /setTimeout\(stop,/);
  assert.match(NAV_LOADER_SCRIPT, /prefers-reduced-motion/);
});

test("layout inlines the nav loader and mounts the motion layer", () => {
  const layout = read("app/layout.js");
  assert.match(layout, /<script id="cc-nav-loader" dangerouslySetInnerHTML=\{\{ __html: NAV_LOADER_SCRIPT \}\} \/>/);
  assert.match(layout, /<MotionEffects \/>/);
});

test("motion layer never hides on-screen content and honours reduced motion", () => {
  const src = read("components/store/MotionEffects.jsx");
  assert.match(src, /getBoundingClientRect\(\)\.top < vh\) continue/);
  assert.match(src, /prefers-reduced-motion: reduce/);
  assert.match(src, /\(hover: hover\) and \(pointer: fine\)/);
});

test("order success shows the delivery scene; checkout keeps a loader until redirect", () => {
  assert.match(read("components/store/CheckoutSuccessView.jsx"), /<DeliveryScene\s/);
  const checkout = read("components/store/CheckoutView.jsx");
  assert.match(checkout, /setRedirecting\(true\);\n\s*window\.location\.href = `\/checkout\/success/);
  assert.match(checkout, /submitting \|\| redirecting/);
  // Journey card: van follows the route (Safari-safe SMIL), parks still under reduced motion.
  const scene = read("components/store/DeliveryScene.jsx");
  assert.match(scene, /<animateMotion/);
  assert.match(scene, /keyPoints=\{reduced \? "0\.94;0\.94" : "0;0\.94"\}/);
  // Only the CONFIRMED Lahore ETA is ever shown; no invented timing for other cities.
  assert.match(scene, /lahore \? `Lahore: \$\{lahoreEtaRange\(\)\} days`/);
  // Public order API exposes the city only — never street or phone.
  const api = read("app/api/orders/[id]/public/route.js");
  assert.match(api, /shippingCity: String\(order\?\.shippingAddress\?\.city/);
  assert.doesNotMatch(api, /shippingAddress\.(line|street|address1|phone)/);
  const css = read("app/globals.css");
  assert.match(css, /\.pj-progress \{\n\s*stroke-dasharray: 100;\n\s*stroke-dashoffset: 0;/);
});

test("empty screens use the animated art", () => {
  assert.match(read("components/store/CartDrawer.jsx"), /<EmptyArt variant="cart"/);
  assert.match(read("app/wishlist/page.jsx"), /<EmptyArt variant="wishlist"/);
  assert.match(read("components/store/ServerProductGrid.jsx"), /<EmptyArt variant="search"/);
  assert.match(read("components/store/MissingProductView.jsx"), /<EmptyArt variant="lost"/);
  assert.match(read("components/store/AccountOrdersView.jsx"), /<EmptyArt variant="orders"/);
});

test("network-adaptive: prefetch only on fast links, lite mode on slow/low-end, offline guard", () => {
  const s = NAV_LOADER_SCRIPT;
  // FAST → Speculation Rules prefetch (never prerender: prerender would run pixels/GA).
  assert.match(s, /net !== "fast" \|\| specDone/);
  assert.match(s, /speculationrules/);
  assert.match(s, /prefetch: \[/);
  assert.doesNotMatch(s, /prerender/);
  // Private / stateful pages are never prefetched.
  for (const p of ["/api/*", "/account*", "/checkout*", "/cart*", "/wishlist*"]) {
    assert.ok(s.includes(`"${p}"`), `prefetch must exclude ${p}`);
  }
  assert.match(s, /\[href\*='\?'\]/);
  // SLOW → Data Saver / 2G / 3G / high RTT, plus low-end devices → lite.
  assert.match(s, /c\.saveData/);
  assert.match(s, /et !== "4g"/);
  assert.match(s, /deviceMemory <= 2/);
  assert.match(s, /setAttribute\("data-lite", "1"\)/);
  assert.match(s, /net === "slow" \? 120 : 260/);
  assert.match(s, /Slow internet — still loading/);
  // iOS fallback from Navigation Timing; offline taps show a message, not the browser error.
  assert.match(s, /getEntriesByType\("navigation"\)/);
  assert.match(s, /navigator\.onLine !== false/);
  assert.match(s, /e\.stopPropagation\(\);\n\s*netBanner\(OFFLINE, false\);\n\s*\}, true\);/);
  // Measured verdict beats the reported one and is remembered for the visit.
  assert.match(s, /sessionStorage\.setItem\("cc-net", v\)/);
  assert.match(s, /ttfb > 2500 \|\| dl > 2500/);
  assert.match(s, /learned\("slow"\);\n\s*if \(net !== "slow"\) setNet\("slow", true\);/);
  assert.match(s, /addEventListener\("online"/);

  assert.match(read("components/home/HomeHero.jsx"), /if \(reduceMotion \|\| lite\) return undefined;/);
  assert.match(read("components/store/MotionEffects.jsx"), /lite \? \[setupCartPop\(\)\]/);
});
