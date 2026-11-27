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

test("journey card: Pakistani touches stay true to geography", () => {
  const scene = read("components/store/DeliveryScene.jsx");
  // GT Road label only for cities really on GT Road (N-5); Minar-e-Pakistan only for Lahore.
  assert.match(scene, /\{gtRoad \? \(/);
  assert.match(scene, /\{lahore \? <MinarEPakistan/);
  const gt = scene.match(/GT_ROAD_CITIES =\s*\n?\s*\/\^\(([^)]*)\)\$\/i/);
  assert.ok(gt, "GT_ROAD_CITIES regex present");
  for (const c of ["lahore", "gujrat", "jhelum", "rawalpindi", "peshawar"]) assert.ok(gt[1].split("|").includes(c), c);
  for (const c of ["karachi", "multan", "faisalabad", "sialkot", "quetta"]) assert.ok(!gt[1].split("|").includes(c), c);
  // Urdu alongside English, the truck-art line, and the founder's note.
  assert.match(scene, /دیکھ مگر پیار سے/);
  // Light touch: Urdu only on the truck-art ribbon; never call the business "small".
  assert.equal((scene.match(/lang="ur"/g) || []).length, 1);
  assert.doesNotMatch(scene, /small (pakistani )?business/i);
  assert.doesNotMatch(read("components/store/FounderThanksNote.jsx"), /small (pakistani )?business/i);
  assert.match(read("components/store/FounderThanksNote.jsx"), /href=\{FOUNDER_PATH\} className=\{`pj-note/);
});

test("Google review card: policy-safe copy, success page + tracking only when delivered", () => {
  const card = read("components/store/GoogleReviewCard.jsx");
  const copy = card.slice(card.indexOf("const COPY"), card.indexOf("function GoogleG"));
  // Google policy: no incentives, no review gating, ask for HONEST reviews.
  assert.doesNotMatch(copy, /discount|coupon|free|reward|gift|win|% off|cashback/i);
  assert.doesNotMatch(copy, /not happy|unhappy|if you loved|only if|5[- ]star/i);
  assert.equal((copy.match(/honest/g) || []).length, 2);
  assert.match(card, /href="\/review" target="_blank" rel="noopener noreferrer"/);
  assert.match(read("components/store/CheckoutSuccessView.jsx"), /<GoogleReviewCard variant="after-order"/);
  assert.match(
    read("components/store/OrderTrackingView.jsx"),
    /\{step === PIPELINE\.length - 1 \? <GoogleReviewCard variant="delivered"/
  );
});

test("order success page: confirmation first, then journey, details, customer care", () => {
  const v = read("components/store/CheckoutSuccessView.jsx");
  const at = (needle) => {
    const i = v.indexOf(needle);
    assert.ok(i > 0, `missing ${needle}`);
    return i;
  };
  const hero = at('<header className="osp-hero">');
  const title = at('<h1 className="osp-title">');
  const journey = at('<section className="osp-journey"');
  const details = at('<section className="osp-details"');
  const care = at('<section className="osp-care"');
  assert.ok(hero < title && title < journey && journey < details && details < care);
  // Order summary shows items with thumbnails + totals; API gives city + thumbnails only.
  assert.match(v, /className="osp-items"/);
  assert.match(v, /className="osp-totals"/);
  const api = read("app/api/orders/[id]/public/route.js");
  assert.match(api, /it\.image = imageById\.get\(it\.productId\)/);
  assert.match(api, /cardImageUrl\(raw, 400\)/);
  // Mobile stacks in the same order; desktop keeps the summary in a sticky right column.
  const css = read("app/globals.css");
  assert.match(css, /grid-template-areas: "journey" "details" "care";/);
  assert.match(css, /grid-template-areas: "journey details" "care details";/);
});

test("booking advance on success page is a compact note (details tucked under How to pay)", () => {
  const v = read("components/store/CheckoutSuccessView.jsx");
  assert.match(v, /className="osp-advance" role="note"/);
  assert.match(v, /<details className="osp-advance__how">/);
  assert.match(v, /Deducted from your total · \$\{formatPrice\(remainingCod\)\} on delivery/);
  assert.doesNotMatch(v, /<WhatsAppPaymentButton/);
});

test("order success stays short: collapsible summary, one-line founder + review strip", () => {
  const v = read("components/store/CheckoutSuccessView.jsx");
  assert.match(v, /<details className="osp-card osp-sum">/);
  assert.match(v, /<FounderThanksNote compact \/>/);
  assert.match(v, /<GoogleReviewCard variant="after-order" compact \/>/);
  assert.doesNotMatch(v, /className="osp-meta"/);
  const card = read("components/store/GoogleReviewCard.jsx");
  const strip = card.slice(card.indexOf("if (compact)"), card.indexOf("return (\n    <aside"));
  assert.match(strip, /honest review on Google/);
  assert.doesNotMatch(strip, /discount|coupon|free|reward|5[- ]star/i);
});

test("success page: summary looks tappable; every review star opens Google (no gating)", () => {
  const v = read("components/store/CheckoutSuccessView.jsx");
  assert.match(v, /className="osp-sum__btn"/);
  assert.match(v, /<div className="osp-sum__body">/);
  const css = read("app/globals.css");
  assert.match(css, /\.osp-sum\[open\] \.osp-sum__body \{ animation: osp-open/);
  const card = read("components/store/GoogleReviewCard.jsx");
  const strip = card.slice(card.indexOf("if (compact)"), card.indexOf("return (\n    <aside"));
  // One link target for all 5 stars — never route low ratings elsewhere.
  assert.match(strip, /\[5, 4, 3, 2, 1\]\.map/);
  assert.equal((strip.match(/href="/g) || []).length, 1);
  assert.match(strip, /href="\/review"/);
});
