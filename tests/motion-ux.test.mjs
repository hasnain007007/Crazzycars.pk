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
  assert.match(read("components/store/CheckoutSuccessView.jsx"), /<DeliveryScene /);
  const checkout = read("components/store/CheckoutView.jsx");
  assert.match(checkout, /setRedirecting\(true\);\n\s*window\.location\.href = `\/checkout\/success/);
  assert.match(checkout, /submitting \|\| redirecting/);
  // Reduced motion = final (delivered) frame: base styles hold the end state.
  const css = read("app/globals.css");
  assert.match(css, /\.ds-move \{ transform: translateX\(126px\);/);
  assert.match(css, /\.ds-parcel \{ transform: translate\(100px, 18px\);/);
});

test("empty screens use the animated art", () => {
  assert.match(read("components/store/CartDrawer.jsx"), /<EmptyArt variant="cart"/);
  assert.match(read("app/wishlist/page.jsx"), /<EmptyArt variant="wishlist"/);
  assert.match(read("components/store/ServerProductGrid.jsx"), /<EmptyArt variant="search"/);
  assert.match(read("components/store/MissingProductView.jsx"), /<EmptyArt variant="lost"/);
  assert.match(read("components/store/AccountOrdersView.jsx"), /<EmptyArt variant="orders"/);
});
