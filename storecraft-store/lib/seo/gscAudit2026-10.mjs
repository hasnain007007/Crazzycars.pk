/**
 * Search Console audit copy (10 Oct 2026) — titles, metas, H1s, intros, FAQs.
 * Code overrides prefer these absolute values; Mongo apply script mirrors them.
 * Bracketed owner questions are omitted here and listed in SEO_TODO_FOR_OWNER.md.
 */

import { STORE_CONTACT, STORE_POLICY } from "../../config/store-policy.js";
import { formatPkrAmount, standardFeePkr } from "../storePolicyCopy.js";

const WA = STORE_CONTACT.whatsapp;
const FEE_REGULAR = formatPkrAmount(standardFeePkr());
const FEE_BULKY = formatPkrAmount(STORE_POLICY.shipping.bulkyFeePKR || 500);

/** @typedef {{ title: string, meta: string }} SeoPair */

/** Phase 2 table — path → absolute title + meta (≤62 / ≤160). */
export const PAGE_SEO_OVERRIDES = {
  "/toyota-corolla-grande-steering-wheel-trim-in-carbon-fiber-multimedia": {
    title: "Corolla Grande Steering Wheel Trim (Carbon Look)",
    meta: "Carbon-look steering wheel trim for Toyota Corolla Grande 2014–2026. Price in Pakistan, COD on eligible items, nationwide delivery.",
  },
  "/toyota-corolla-gli-xli-2009-2014-multimedia-steering-wheel-audio-control-buttons": {
    title: "Corolla GLi/XLi 2009–2014 Steering Audio Control Buttons",
    meta: "Multimedia steering wheel audio control buttons for Toyota Corolla GLi/XLi 2009–2014. Price in Pakistan, plug-and-play wiring, COD on eligible items.",
  },
  "/funny-window-hand-gesture-led-light": {
    title: "Funny Hand Gesture LED Light for Car Rear Window",
    meta: "Funny hand gesture LED light for the car rear window: USB powered, animated gestures, suction-cup mount, universal fit. Price in Pakistan, COD available.",
  },
  "/toyota-corolla-2009-2026-carbon-steering-monogram-abs": {
    title: "Toyota Corolla Steering Monogram – Carbon Style 2009–2026",
    meta: "Carbon-style steering monogram for Toyota Corolla 2009–2026 (also Aqua, Vitz, Yaris). Peel-and-stick, Rs. 799. COD on eligible items, nationwide delivery.",
  },
  "/car-front-bumper-splitter-abs-plastic-3pcs": {
    title: "Batman Style Front Bumper Splitter 3PCS – Universal Fit",
    meta: "Batman style 3-piece front bumper splitter, ABS, gloss black, universal fit with hardware. Price in Pakistan, COD on eligible items, nationwide delivery.",
  },
  "/toyota-aqua-2012-2015-complete-body-kit": {
    title: "Toyota Aqua 2012–2015 Body Kit Price in Pakistan",
    meta: "Complete body kit for Toyota Aqua 2012–2015: front lip, side skirts, rear lip in unpainted ABS. Price in Pakistan, prepaid only, nationwide delivery.",
  },
  "/toyota-corolla-2015-2026-rs-style-trunk-spoiler-abs": {
    title: "Toyota Corolla 2015–2026 RS Style Trunk Spoiler | CrazzyCars",
    meta: "Toyota Corolla 2015–2026 RS style trunk spoiler price in Pakistan: gloss black ABS, 3M tape install. COD on eligible items, nationwide delivery.",
  },
  "/honda-city-new-model-trunk-lip-spoiler-2021-2026": {
    title: "Honda City 2021–2026 RS Trunk Lip Spoiler | CrazzyCars",
    meta: "Honda City trunk spoiler price in Pakistan: RS style trunk lip spoiler for City 2021–2026 (1.2L, 1.5L, Aspire). COD on eligible items, nationwide delivery.",
  },
  "/deepal-s05-batman-style-side-mirror-covers": {
    title: "Deepal S05 Batman Side Mirror Covers Price in Pakistan",
    meta: "Deepal S05 (SO5) Batman style side mirror covers in carbon fibre or gloss black ABS. Price in Pakistan, COD on eligible items, nationwide delivery.",
  },
  "/categories/led-indicator-lights": {
    title: "LED Indicator Lights & Mirror Indicators | CrazzyCars.pk",
    meta: "LED indicator lights for Corolla, Civic and City. Side mirror indicators for the Toyota Corolla are priced from Rs. 4,999. COD on eligible items.",
  },
  "/categories/splitters-side-skirts": {
    title: "Car Side Skirts & Bumper Splitters in Pakistan | CrazzyCars",
    meta: "Buy car side skirts, front and rear bumper splitters and lip kits in Pakistan for Civic and Corolla. COD on eligible items, nationwide delivery.",
  },
  "/categories/quarter-window-louvers": {
    title: "Quarter Window Louvers Price in Pakistan | Civic, Corolla",
    meta: "Quarter window louvers for Civic, Corolla, City, Alto, Yaris and Prius in Pakistan. Carbon and black options. COD on eligible items, nationwide delivery.",
  },
  "/categories/interior-lights": {
    title: "Car Interior & Ambient Lights Price in Pakistan | CrazzyCars",
    meta: "Buy car interior lights in Pakistan: ambient dashboard strips, footwell RGB lights, door welcome logo lights and roof star lights. COD on eligible items.",
  },
  "/categories/led-lighting": {
    title: "Car LED Lights in Pakistan – Headlights, Indicators, DRL",
    meta: "Shop car LED lights in Pakistan: headlights, fog lamps and DRL covers, indicators, tail lights, reflectors and SOS flashers. COD on eligible items.",
  },
  "/categories/steering-wheel-covers": {
    title: "Steering Wheel Covers Price in Pakistan | CrazzyCars",
    meta: "Steering wheel covers in Pakistan, including hand-stitched carbon fiber in universal fit. Price on every listing. COD on eligible items, nationwide delivery.",
  },
  "/categories/stickers-monograms-emblems": {
    title: "Car Stickers & Steering Monograms | CrazzyCars",
    meta: "Car stickers, monograms and emblems in Pakistan, including Corolla carbon-style steering monograms. COD on eligible items. WhatsApp 03284010007.",
  },
  "/track-order": {
    title: "Track Your Order | CrazzyCars",
    meta: "Track your CrazzyCars order with your PostEx or Run Courier tracking number, or WhatsApp 03284010007 for help. Nationwide delivery from Gujranwala.",
  },
  "/car-heads-up-display-hud": {
    title: "Car HUD Heads Up Display Price in Pakistan | CrazzyCars",
    meta: "Car HUD heads up display in Pakistan: speed, voltage and over-speed alarm, auto on/off, plug-and-play. Rs. 3,499. COD on eligible items, nationwide delivery.",
  },
  "/cars/toyota-yaris-2020-present": {
    title: "Toyota Yaris 2020–2026 Accessories in Pakistan | CrazzyCars",
    meta: "Toyota Yaris 2020–2026 accessories in Pakistan: TPE floor mats, dashboard mat, key cover, spoilers, louvers, body kit. COD on eligible items, nationwide.",
  },
  "/cars/suzuki-alto-2020-present": {
    title: "Suzuki Alto 2019–2026 Accessories in Pakistan | CrazzyCars",
    meta: "Suzuki Alto 2019–2026 accessories in Pakistan: lava tail lights, steering controls, roof spoiler, indicators, mats and key covers. COD on eligible items.",
  },
  "/cars/suzuki-swift-2025-present": {
    title: "Suzuki Swift 2025–Present Accessories in Pakistan | CrazzyCars",
    meta: "Suzuki Swift 2025–present accessories in Pakistan: floor mats, dashboard mat, key cover, carbon side mirror and door handle covers. COD on eligible items.",
  },
  "/cars/toyota-aqua-2012-present": {
    title: "Toyota Aqua Accessories & Body Kits in Pakistan | CrazzyCars",
    meta: "Toyota Aqua accessories in Pakistan: body kits by year, Batman side mirror covers, front splitters, floor mats and dashboard mat. COD on eligible items.",
  },
  "/cars/honda-civic-x-2016-2021": {
    title: "Honda Civic X 2016–2021 Accessories & Carbon Interior Trims",
    meta: "Honda Civic X 2016–2021 accessories in Pakistan: carbon interior trims, DRLs, fog lamps, spoilers, grille and more. COD on eligible items.",
  },
  "/cars/honda-city-2021-present": {
    title: "Honda City 2021–Present Accessories in Pakistan",
    meta: "Honda City 2021–2026 accessories in Pakistan: trunk spoiler, gear knob, fog lights, body kits and mats. COD on eligible items.",
  },
  "/cars/suzuki-liana-2006-2014": {
    title: "Suzuki Liana 2006–2014 Accessories | CrazzyCars.pk",
    meta: "Suzuki Liana 2006–2014 accessories in Pakistan: velvet dashboard mat. COD on eligible items. WhatsApp for other parts.",
  },
  "/toyota-corolla-x-carbon-fiber-interior-door-handle-panels-2014-2026": {
    title: "Corolla X Door Handle Panels 2014–2026 Set of 4 | CrazzyCars",
    meta: "Buy Toyota Corolla X carbon-style interior door handle panels (set of 4) for 2014–2026 Grande/Altis. Sale Rs. 5,999. COD on eligible items at CrazzyCars.pk.",
  },
  "/contact": {
    title: "Contact CrazzyCars.pk – WhatsApp, Phone & Gujranwala Store",
    meta: `Contact CrazzyCars.pk: WhatsApp ${WA}, email, store address in Gujranwala and opening hours. Ask about fitment, orders and delivery.`,
  },
  "/": {
    title: "CrazzyCars.pk – Car Accessories in Pakistan | Body Kits & LED",
    meta: "Buy car accessories online in Pakistan: splitters, body kits, LED lights, carbon fiber and interior accessories. COD on eligible items, nationwide delivery.",
  },
  // Phase 4 ranking-page meta only (title/H1/URL unchanged except noted)
  "/cars/toyota-corolla-e140-2009-2014": {
    meta: "Toyota Corolla E140 (2009–2014) accessories in Pakistan: body kits, grilles, projector headlights, spoilers and LEDs. COD on eligible items, nationwide.",
  },
  // Ranking page: title locked; fix truncated "Butto" in meta only
  "/toyota-corolla-2012-top-ac-panel": {
    meta: "Corolla AC vent cover price in Pakistan: Top AC Panel Center Dashboard AC Vent Button 2008-2013 for Toyota Corolla 2012. Cash on Delivery & nationwide delivery.",
  },
};

/** Slugs the apply script and GSC audit must never rewrite (owner decision pending). */
export const CATEGORY_APPLY_SKIP = new Set(["led-headlights-bulbs"]);

/** Category H1 overrides (display name). */
export const CATEGORY_H1_OVERRIDES = {
  "interior-lights": "Car Interior Lights & Ambient Lights in Pakistan",
  "led-indicator-lights": "LED Indicator Lights & Side Mirror Indicators in Pakistan",
};

/** Product H1 override (ranking page truncation fix only). */
export const PRODUCT_H1_OVERRIDES = {
  "toyota-corolla-2012-top-ac-panel":
    "Toyota Corolla 2012 Top AC Panel Center Dashboard AC Vent Button 2008–2013",
};

/** Product name rename (search query alignment). */
export const PRODUCT_NAME_OVERRIDES = {
  "honda-city-2021-2026-carbon-fiber-gear-knob":
    "Honda City Carbon Fiber Gear Knob Cover 2021–2026",
};

/** Ranking pages whose title must not change (ground rule). */
export const RANKING_PAGES_TITLE_LOCKED = new Set([
  "/cars/toyota-corolla-e140-2009-2014",
  "/toyota-corolla-airflow-ambient-led-ac-vent-trims-plug-and-play",
  "/changan-oshan-x7-batman-style-side-mirror-covers",
  "/toyota-corolla-2012-top-ac-panel",
  "/toyota-yaris-2020-2026-trunk-lip-spoiler-abs-plastic",
]);

/** Ranking pages whose H1 must not change (except AC panel). */
export const RANKING_PAGES_H1_LOCKED = new Set([
  "/cars/toyota-corolla-e140-2009-2014",
  "/car-heads-up-display-hud",
  "/toyota-corolla-airflow-ambient-led-ac-vent-trims-plug-and-play",
  "/changan-oshan-x7-batman-style-side-mirror-covers",
  "/toyota-yaris-2020-2026-trunk-lip-spoiler-abs-plastic",
]);

export function getPageSeoOverride(path) {
  const key = String(path || "").split("?")[0].replace(/\/+$/, "") || "/";
  return PAGE_SEO_OVERRIDES[key] || null;
}

export function assertSeoLengths(pair, path) {
  const errors = [];
  if (pair?.title && pair.title.length > 62) {
    errors.push(`${path} title length ${pair.title.length} > 62`);
  }
  if (pair?.meta && pair.meta.length > 160) {
    errors.push(`${path} meta length ${pair.meta.length} > 160`);
  }
  return errors;
}

/** Category description HTML (intro + H2 blocks + FAQ as h3/p for existing splitter). */
export const CATEGORY_DESCRIPTION_HTML = {
  "stickers-monograms-emblems": `
<p>Car stickers, monograms and emblems at CrazzyCars.pk personalise the cabin and exterior. We currently list the Toyota Corolla Carbon Fiber Style Steering Monogram 2009–2026 (ABS). More stickers and emblems are added as stock arrives. Clean and dry the surface before applying. Cash on Delivery on eligible items; WhatsApp ${WA} to check availability.</p>
<h2>Steering monograms</h2>
<p>The Corolla carbon-style steering monogram fits Toyota Corolla E140 and E170–E210 generations (2009–2026). See the product page for price and fitment.</p>
<h3>Do you sell other car stickers?</h3>
<p>Ask on WhatsApp ${WA} with your make, model and year — we can confirm what is in stock before you order.</p>
`.trim(),

  "interior-lights": `
<p>Car interior lights at CrazzyCars.pk run from Rs. 499 to Rs. 14,999. The range covers ambient dashboard light strips, RGB footwell lights, door welcome logo projectors and USB roof star lights. Each product page lists fitment, what is in the box and the current price. We ship nationwide from Gujranwala and offer Cash on Delivery on eligible items.</p>
<h2>Car ambient light for the dashboard and doors</h2>
<p>The Car Dashboard Ambient Light Strip 2PCS is Rs. 2,499 and the Car Interior Ambient Lights 5 Point Dashboard + Doors is Rs. 3,799. Both add accent lighting along the dashboard and door panels. The Premium Dynamic Ambient Interior Lights Multi-Point is Rs. 6,500.</p>
<h2>Footwell lights</h2>
<p>The Car RGB Atmosphere Light is a set of 4 interior footwell LED lights for Rs. 1,299.</p>
<h2>Door welcome lights and roof star lights</h2>
<p>The Car Door Welcome Logo Lights (bright LED projection) are Rs. 3,499. The USB Car Roof Star Night Light Galaxy Projector (Red) is Rs. 499 and runs on USB power.</p>
<h2>Interior lights made for one model</h2>
<p>For the Toyota Corolla E170 to E210 (2014–2026), the Corolla AirFlow Ambient LED AC Vent Trims are plug and play, need no tools and take about 15 to 20 minutes to fit. Price: Rs. 14,999. See <a href="/toyota-corolla-airflow-ambient-led-ac-vent-trims-plug-and-play">Corolla AirFlow Ambient LED AC Vent Trims</a>.</p>
<h3>What is the price of car interior lights in Pakistan?</h3>
<p>They start at Rs. 499 for a USB roof star light. Footwell RGB lights are Rs. 1,299, dashboard ambient strips start at Rs. 2,499, and the Corolla AirFlow vent trims are Rs. 14,999.</p>
<h3>Will it fit my car?</h3>
<p>Universal lights fit most cars. Model-specific items list their years on the product page. Send your make, model, year and variant to WhatsApp ${WA}.</p>
<h3>Can I pay with Cash on Delivery?</h3>
<p>Yes, on eligible items. The delivery charge (${FEE_REGULAR} regular, ${FEE_BULKY} bulky) is paid in advance and the product amount on arrival.</p>
`.trim(),

  "led-indicator-lights": `
<p>LED indicator lights on CrazzyCars.pk start at Rs. 1,199 for a pair of universal Bright LED Indicator Bulbs. Side mirror indicators for the Toyota Corolla are priced from Rs. 4,999. Honda Civic Rebirth and Honda City Classic RGB side mirror indicators are Rs. 8,500 each. Each product page lists fitment, what is in the box and the current price. Cash on Delivery is available on eligible items.</p>
<h2>LED indicator bulbs</h2>
<p>Bright LED Indicator Bulbs 2PCS (universal) are Rs. 1,199.</p>
<h2>Side mirror indicators by car</h2>
<ul>
<li>Toyota Corolla 2008–2013, sequential LED: Rs. 4,999</li>
<li>Toyota Corolla 2014–2026, neon style: Rs. 6,500</li>
<li>Honda City Classic, RGB: Rs. 8,500</li>
<li>Honda Civic Rebirth, RGB: Rs. 8,500</li>
<li>Universal LED reflector bumper side marker: Rs. 1,899</li>
</ul>
<h3>What is the price of LED indicator lights in Pakistan?</h3>
<p>Indicator bulbs start at Rs. 1,199 for a pair. Toyota Corolla side mirror indicators start at Rs. 4,999; Honda Civic and City RGB units are Rs. 8,500.</p>
<h3>Will a side mirror indicator fit my car?</h3>
<p>Each one lists its model and years. Send yours to WhatsApp ${WA} if unsure.</p>
`.trim(),

  "steering-wheel-covers": `
<p>A steering wheel cover adds grip and a new look to the wheel. The Carbon Fiber Hand Stitched Steering Wheel Cover (universal fit) is Rs. 1,199.</p>
`.trim(),
};

/** Vehicle description HTML / plain blocks placed under H1. */
export const VEHICLE_DESCRIPTION_HTML = {
  "toyota-yaris-2020-present": `
<p>Toyota Yaris 2020–2026 accessories at CrazzyCars.pk: TPE floor mats (Rs. 8,699), velvet dashboard mat (Rs. 1,799), metal key cover (Rs. 1,399), Batman style side mirror covers (Rs. 3,199), gloss black quarter window louvers (Rs. 2,299), roof spoiler (Rs. 3,999), trunk lip spoiler (Rs. 4,999), a 2020–2021 complete body kit (Rs. 10,999) and carbon fiber door handle covers (Rs. 2,999). Each product page shows the price in Pakistan, model years and what is in the box.</p>
<h2>Toyota Yaris spoilers</h2>
<p>Two spoilers are sold: the roof spoiler (Rs. 3,999) and the trunk lip spoiler (Rs. 4,999, gloss black ABS plastic, fitted with 3M tape).</p>
<h2>Toyota Yaris body kit</h2>
<p>The Toyota Yaris 2020–2021 Complete Body Kit is Rs. 10,999. Body kits are prepaid orders; Cash on Delivery does not apply.</p>
<h3>What accessories are available for the Toyota Yaris in Pakistan?</h3>
<p>Floor mats, a dashboard mat, a key cover, side mirror covers, window louvers, two spoilers, a body kit and door handle covers, from Rs. 1,399.</p>
`.trim(),

  "suzuki-alto-2020-present": `
<p>Suzuki Alto 2019–2026 (660cc) accessories at CrazzyCars.pk: Lava style smoke tail lights (Rs. 11,999), multimedia steering control buttons (Rs. 7,500), RS Turbo style rear roof spoiler (Rs. 4,999), Audi style side fender indicators in smoke (Rs. 1,599), carbon fiber style side mirror covers (Rs. 3,499), rear window louvers (Rs. 2,299), TPE floor mats (Rs. 7,799), velvet dashboard mat (Rs. 1,799) and a metal key cover (Rs. 1,399).</p>
<h2>Suzuki Alto Lava style tail lights</h2>
<p>The Suzuki Alto 660cc Lava Style Smoke Tail Lights (rear lamps, pair) are Rs. 11,999.</p>
<h2>Suzuki Alto multimedia steering control buttons</h2>
<p>Two versions are listed, both Rs. 7,500: the 2018–2023 Multimedia Steering Wheel Audio Control Buttons Panel, and the Multimedia Steering Control Buttons with Spiral Cable in glossy black.</p>
<h2>Suzuki Alto roof spoiler</h2>
<p>The Suzuki Alto 2019–2026 RS Turbo Style Rear Roof Spoiler is Rs. 4,999.</p>
<h3>Is there a page for the older Alto?</h3>
<p>Yes. <a href="/cars/suzuki-alto-old-2000-2012">Alto 2000–2012</a> has its own page.</p>
<h3>What is the price of Alto Lava tail lights in Pakistan?</h3>
<p>Rs. 11,999 for the pair.</p>
`.trim(),

  "suzuki-swift-2025-present": `
<p>Suzuki Swift 2025–present (4th generation, Z Series) accessories at CrazzyCars.pk: carbon fiber side mirror covers (Rs. 3,999), carbon fiber door handle covers (Rs. 3,399, listed for 2022–2025), TPE floor mats (Rs. 7,799), velvet dashboard mat (Rs. 1,799) and a premium metal key cover (Rs. 1,399).</p>
<h2>Which Suzuki Swift do you have?</h2>
<table><thead><tr><th>Generation</th><th>Page</th></tr></thead><tbody>
<tr><td>Swift 2018–2024</td><td><a href="/cars/suzuki-swift-2018-2024">/cars/suzuki-swift-2018-2024</a></td></tr>
<tr><td>Swift 2025–present</td><td>This page</td></tr>
</tbody></table>
`.trim(),

  "toyota-aqua-2012-present": `
<p>Toyota Aqua accessories at CrazzyCars.pk: body kits for 2012–2022 model years, Batman style side mirror covers (Rs. 3,199), a Sportline front splitter, TPE floor mats (Rs. 7,799) and a velvet dashboard mat (Rs. 1,799). Body kits are prepaid orders.</p>
<h2>Toyota Aqua body kit price in Pakistan, by year</h2>
<table><thead><tr><th>Kit</th><th>Years</th><th>Price</th></tr></thead><tbody>
<tr><td>Complete Body Kit</td><td>2012–2015</td><td>Rs. 12,999</td></tr>
<tr><td>Front Body Kit, fibreglass</td><td>2016–2019</td><td>Rs. 7,499</td></tr>
<tr><td>TRD Sportivo Body Kit</td><td>2016–2019</td><td>Rs. 12,999</td></tr>
<tr><td>Rear Body Kit, fibreglass</td><td>2020–2022</td><td>Rs. 5,999</td></tr>
<tr><td>Sportline Front Splitter Canards, red/black</td><td>2022–2024</td><td>Rs. 3,499</td></tr>
</tbody></table>
<h2>Toyota Aqua side mirror cover</h2>
<p>The Batman Style Side Mirror Cover for the Toyota Aqua 2012–present is Rs. 3,199.</p>
`.trim(),

  "honda-city-2021-present": `
<p>Honda City 2021–2026 accessories at CrazzyCars.pk: RS style trunk lip spoiler (Rs. 4,999), carbon fiber gear knob cover (Rs. 3,800), carbon fiber steering trim (Rs. 3,800), premium fog lights with covers (Rs. 6,999), Batman style side mirror covers (Rs. 3,499), Drive 68 and Modulo style fibreglass body kits (Rs. 13,999 each), TPE floor mats (Rs. 7,799) and a velvet dashboard mat (Rs. 1,799).</p>
<h2>Which Honda City do you have?</h2>
<table><thead><tr><th>Generation</th><th>Page</th></tr></thead><tbody>
<tr><td>Honda City 2009–2020</td><td><a href="/cars/honda-city-classic-2009-2020">/cars/honda-city-classic-2009-2020</a></td></tr>
<tr><td>Honda City 2021–present</td><td>This page</td></tr>
</tbody></table>
<h2>Honda City gear knob cover</h2>
<p>The Honda City Carbon Fiber Gear Knob Cover 2021–2026 is Rs. 3,800.</p>
<h3>What is the price of a Honda City body kit in Pakistan?</h3>
<p>The Drive 68 and Modulo style fibreglass kits for 2021–2025 are Rs. 13,999 each. Body kits are prepaid.</p>
`.trim(),

  "honda-civic-x-2016-2021": `
<h2>Honda Civic X interior accessories and carbon trims</h2>
<p>The Civic X (10th generation) range includes a carbon fiber interior trim kit (Rs. 37,999), AC vent trims (Rs. 3,999), front dashboard trims 3PCS (Rs. 3,799), inner door trims 4PCS (Rs. 4,499), armrest console trim 3PCS (Rs. 4,999), cup holder trim (Rs. 2,199), gear shift panel trim (Rs. 3,999) and steering multimedia trims (Rs. 1,999).</p>
<h2>Honda Civic X front grille</h2>
<p>The Diamond style SI grille in glossy black ABS is Rs. 9,999.</p>
<h2>Honda Civic X trunk spoiler</h2>
<p>The RS style trunk spoiler is Rs. 5,999.</p>
`.trim(),

  "suzuki-liana-2006-2014": `
<p>CrazzyCars.pk sells the Velvet Dashboard Mat for the Suzuki Liana 2006–2014 (Rs. 1,799). It is a cover that lies on the dashboard. It is not a replacement dashboard. To ask for another Liana accessory, message WhatsApp ${WA} with your year and variant.</p>
`.trim(),

  "toyota-corolla-e140-2009-2014": `
<h2>Corolla E140 lights</h2>
<p>RGB back bumper light, Nike Style 3 projector headlights, Lava style tail lights, LED rear bumper reflectors.</p>
<h2>Corolla E140 exterior</h2>
<p>TRD style front grill, ducktail trunk spoiler.</p>
<h2>Corolla E140 interior</h2>
<p>TPE floor mats, crystal LED gear knob, carbon style steering monogram.</p>
`.trim(),
};

/** Extra product copy blocks (slug → { introHtml, appendDescription, careHtml, features }). */
export const PRODUCT_CONTENT_OVERRIDES = {
  "car-heads-up-display-hud": {
    introHtml: `
<p>A car HUD (head up display) projects your speed and driving data onto the windshield so you keep your eyes on the road. This universal HUD shows speed in km/h and voltage, sounds an over-speed alarm, switches on and off automatically and installs plug-and-play through the OBD port or a power source. Price in Pakistan: Rs. 3,499 (was Rs. 5,000). In the box: HUD unit, OBD/power cable, reflective film and user manual.</p>
<p class="also-searched"><strong>Also searched as:</strong> heads up display, heads up display car, car hud display, auto hud display, hud projector, universal heads up display.</p>
<h2>Car HUD display price in Pakistan</h2>
<p>The Universal Heads Up Display HUD Car Speed Projector is Rs. 3,499, 30% off the Rs. 5,000 list price. Delivery is ${FEE_REGULAR} for regular items. Cash on Delivery is available with a booking advance, and the balance is paid on arrival.</p>
<h2>Which cars does a HUD fit?</h2>
<p>This HUD is universal and fits all car makes and models. Send your make, model, year and variant to WhatsApp ${WA} to confirm.</p>
`.trim(),
  },
  "changan-oshan-x7-batman-style-side-mirror-covers": {
    shortDescription: `These Batman style side mirror covers are made for the Changan Oshan X7 2022–2026. They come in a carbon fiber finish or gloss black, in durable, weather and UV resistant ABS, as a left and right pair. They clip on or fix with double-sided tape, so there is no drilling. Check your year and variant on WhatsApp ${WA} before ordering.`,
    descriptionHtml: `<p>These Batman style side mirror covers are made for the Changan Oshan X7 2022–2026. They come in a carbon fiber finish or gloss black, in durable, weather and UV resistant ABS, as a left and right pair. They clip on or fix with double-sided tape, so there is no drilling. Check your year and variant on WhatsApp ${WA} before ordering.</p>`,
  },
  "toyota-yaris-2020-2026-trunk-lip-spoiler-abs-plastic": {
    appendDescription:
      "This lightweight trunk lip spoiler is made for the Toyota Yaris 2020–2026, in gloss black ABS plastic. It is a single spoiler, not a full body kit, and fits with 3M adhesive tape. Spoiler paint (+Rs. 1,500), wrap (+Rs. 1,000) and double tape (+Rs. 150) can be added at checkout.",
  },
  "toyota-corolla-2012-top-ac-panel": {
    shortDescription:
      "Toyota Corolla 2012 Top AC Panel Center Dashboard AC Vent Button 2008-2013. Carbon-fiber-look finish. Cash on Delivery available nationwide.",
    descriptionHtml: `<p>Toyota Corolla 2012 Top AC Panel Center Dashboard AC Vent Button 2008–2013. Carbon-fiber-look overlay for the centre dashboard AC vent and button control area.</p>`,
    imageAlt:
      "Toyota Corolla 2012 Top AC Panel Center Dashboard AC Vent Button 2008–2013",
    features: [
      "carbon-fiber-look finish",
      "covers scratches and worn factory plastic on the centre AC panel",
    ],
  },
  "toyota-corolla-airflow-ambient-led-ac-vent-trims-plug-and-play": {
    careHtml: `
<h2>Care</h2>
<p>Wipe with a soft, damp microfibre cloth. Avoid harsh chemicals and abrasive pads.</p>
`.trim(),
  },
};

/** FAQ extras merged into existing FAQ builders (no second FAQPage). */
export const CATEGORY_FAQ_OVERRIDES = {
  "interior-lights": [
    {
      question: "What is the price of car interior lights in Pakistan?",
      answer:
        "They start at Rs. 499 for a USB roof star light. Footwell RGB lights are Rs. 1,299, dashboard ambient strips start at Rs. 2,499, and the Corolla AirFlow vent trims are Rs. 14,999.",
    },
    {
      question: "Will it fit my car?",
      answer:
        `Universal lights fit most cars. Model-specific items list their years on the product page. Send your make, model, year and variant to WhatsApp ${WA}.`,
    },
    {
      question: "Can I pay with Cash on Delivery?",
      answer:
        `Yes, on eligible items. The delivery charge (${FEE_REGULAR} regular, ${FEE_BULKY} bulky) is paid in advance and the product amount on arrival.`,
    },
  ],
  "led-indicator-lights": [
    {
      question: "What is the price of LED indicator lights in Pakistan?",
      answer:
        "Indicator bulbs start at Rs. 1,199 for a pair. Side mirror indicators start at Rs. 4,999.",
    },
    {
      question: "Will a side mirror indicator fit my car?",
      answer:
        `Each one lists its model and years. Send yours to WhatsApp ${WA} if unsure.`,
    },
  ],
};

export const VEHICLE_FAQ_OVERRIDES = {
  "toyota-yaris-2020-present": [
    {
      question: "What accessories are available for the Toyota Yaris in Pakistan?",
      answer:
        "Floor mats, a dashboard mat, a key cover, side mirror covers, window louvers, two spoilers, a body kit and door handle covers, from Rs. 1,399.",
    },
  ],
  "suzuki-alto-2020-present": [
    {
      question: "Is there a page for the older Alto?",
      answer:
        "Yes. Alto 2000–2012 has its own page at /cars/suzuki-alto-old-2000-2012.",
    },
    {
      question: "What is the price of Alto Lava tail lights in Pakistan?",
      answer: "Rs. 11,999 for the pair.",
    },
  ],
  "honda-city-2021-present": [
    {
      question: "What is the price of a Honda City body kit in Pakistan?",
      answer:
        "The Drive 68 and Modulo style fibreglass kits for 2021–2025 are Rs. 13,999 each. Body kits are prepaid.",
    },
  ],
};

export const PRODUCT_FAQ_OVERRIDES = {
  "car-heads-up-display-hud": [
    {
      question: "What is the car HUD display price in Pakistan?",
      answer:
        `The Universal Heads Up Display HUD Car Speed Projector is Rs. 3,499, 30% off the Rs. 5,000 list price. Delivery is ${FEE_REGULAR} for regular items. Cash on Delivery is available with a booking advance, and the balance is paid on arrival.`,
    },
    {
      question: "Which cars does a HUD fit?",
      answer:
        `This HUD is universal and fits all car makes and models. Send your make, model, year and variant to WhatsApp ${WA} to confirm.`,
    },
  ],
};
