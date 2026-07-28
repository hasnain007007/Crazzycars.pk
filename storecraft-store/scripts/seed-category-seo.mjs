/**
 * Seed SEO metadata for every Category (StoreCraft nested seo.* fields).
 *
 * Reuses existing schema:
 *   seo.metaTitle / seo.metaDescription / seo.metaKeywords
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-category-seo.mjs --dry-run
 *   node --env-file=.env.local scripts/seed-category-seo.mjs
 *
 * Flags:
 *   --dry-run   Print slug → title/description/keywords; do not write
 *   --force     Overwrite even when metaTitle already set (default: always overwrite SEO)
 */
import mongoose from "mongoose";
import Category from "../lib/models/Category.model.js";

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const BRAND_SUFFIX = " | CrazzyCars.pk";
const DRY_RUN = process.argv.includes("--dry-run");

/** Hardcoded calibration copy (from brief) — keyed by slug. */
const CALIBRATED = {
  exterior: {
    metaTitle: "Car Exterior Accessories in Pakistan | CrazzyCars.pk",
    metaDescription:
      "Shop body kits, splitters, spoilers, mirror covers & more for your car's exterior. Premium fitment for Honda, Toyota & Suzuki. Cash on delivery nationwide.",
    metaKeywords: [
      "car exterior accessories",
      "exterior styling parts pakistan",
      "body kits pakistan",
      "car splitters",
      "car spoilers",
    ],
  },
  "body-kits-extensions": {
    metaTitle: "Body Kits & Extensions – Exterior | CrazzyCars.pk",
    metaDescription:
      "Complete body kit extensions for a wider, more aggressive stance — front lips, side extensions & rear add-ons built for Pakistani roads. Nationwide COD.",
    metaKeywords: [
      "body kit pakistan",
      "body kit extensions",
      "car body kit online",
      "wide body kit",
      "car styling kit",
    ],
  },
  "splitters-side-skirts": {
    metaTitle: "Front Splitters & Side Skirts | CrazzyCars.pk",
    metaDescription:
      "ABS plastic front splitters and side skirt kits that lower your car's visual stance without touching ride height. Easy bolt-on fit, COD nationwide.",
    metaKeywords: [
      "front splitter pakistan",
      "side skirts pakistan",
      "car lip kit",
      "splitter kit online",
    ],
  },
  "spoilers-diffusers": {
    metaTitle: "Car Spoilers & Rear Diffusers | CrazzyCars.pk",
    metaDescription:
      "Rear spoilers and diffusers that sharpen your car's rear profile — direct-fit kits for popular Honda & Toyota models. Cash on delivery across Pakistan.",
    metaKeywords: [
      "car spoiler pakistan",
      "rear diffuser",
      "trunk spoiler",
      "car rear styling",
    ],
  },
  "side-mirror-covers": {
    metaTitle: "Carbon Fiber Side Mirror Covers | CrazzyCars.pk",
    metaDescription:
      "Carbon fiber-finish mirror covers that swap on in minutes for an instant sporty upgrade. Scratch-resistant, direct OEM fit. Nationwide delivery.",
    metaKeywords: [
      "mirror covers pakistan",
      "carbon fiber mirror cover",
      "car side mirror cap",
    ],
  },
  "quarter-window-louvers": {
    metaTitle: "Quarter Window Louvers | CrazzyCars.pk",
    metaDescription:
      "Sedan-style quarter window louvers for a race-inspired rear profile — clip-on fitment, no drilling required. Ships nationwide with COD.",
    metaKeywords: [
      "window louvers pakistan",
      "quarter panel louvers",
      "sedan louvers",
      "rear window cover",
    ],
  },
  "exhaust-systems-tips": {
    metaTitle: "Exhaust Tips & Systems | CrazzyCars.pk",
    metaDescription:
      "Stainless steel exhaust tips and system upgrades for a deeper tone and a finished rear look. Universal and model-specific fitments available.",
    metaKeywords: [
      "exhaust tip pakistan",
      "car exhaust upgrade",
      "stainless exhaust tip",
    ],
  },
  "door-handle-covers": {
    metaTitle: "Door Handle Covers | CrazzyCars.pk",
    metaDescription:
      "Carbon fiber and chrome-finish door handle covers that protect against scratches while sharpening your car's exterior details.",
    metaKeywords: [
      "door handle cover pakistan",
      "car door handle protector",
      "carbon door handle",
    ],
  },
  "front-grilles": {
    metaTitle: "Front Grilles | CrazzyCars.pk",
    metaDescription:
      "Direct-fit front grille upgrades that transform your car's face — mesh and honeycomb styles for popular Pakistani-market models.",
    metaKeywords: [
      "car grille pakistan",
      "front grille upgrade",
      "mesh grille",
      "honeycomb grille",
    ],
  },
  antennas: {
    metaTitle: "Car Antennas | CrazzyCars.pk",
    metaDescription:
      "Shark fin and short antenna upgrades for a cleaner roofline — functional and decorative options, easy self-install. Cash on Delivery nationwide.",
    metaKeywords: [
      "car antenna pakistan",
      "shark fin antenna",
      "roof antenna cover",
    ],
  },
  "door-guards": {
    metaTitle: "Door Edge Guards | CrazzyCars.pk",
    metaDescription:
      "Clear and color-matched door edge guards that stop chips and scrapes from car park dings — an easy first upgrade for any car.",
    metaKeywords: [
      "door guard pakistan",
      "door edge protector",
      "car door scratch guard",
    ],
  },
  // DB products = window visors / rain guards (not fresheners). Accurate copy.
  "air-press": {
    metaTitle: "Car Air Press & Wind Deflectors | CrazzyCars.pk",
    metaDescription:
      "Chrome-strip air press window visors that block rain and sun glare — model-specific for Honda, Toyota & Suzuki. Cash on Delivery nationwide.",
    metaKeywords: [
      "air press pakistan",
      "car wind deflector",
      "window visor pakistan",
      "rain guard",
      "door visor",
    ],
  },
  "stickers-monograms-emblems": {
    metaTitle: "Car Stickers, Monograms & Emblems | CrazzyCars.pk",
    metaDescription:
      "Brand emblems, monogram badges and decal sets to personalize your car — genuine-fit for Toyota, Honda & Suzuki logos. Cash on Delivery nationwide.",
    metaKeywords: [
      "car emblem pakistan",
      "car stickers",
      "monogram badge",
      "car logo replacement",
    ],
  },
  "mud-flaps": {
    metaTitle: "Mud Flaps | CrazzyCars.pk",
    metaDescription:
      "Direct-fit mud flaps that protect your paint and undercarriage from splashback on Pakistan's roads — front and rear sets available.",
    metaKeywords: [
      "mud flaps pakistan",
      "splash guards",
      "car fender flaps",
    ],
  },
  interior: {
    metaTitle: "Car Interior Accessories in Pakistan | CrazzyCars.pk",
    metaDescription:
      "Upgrade your cabin with steering covers, ambient lighting, multimedia controls & more — premium interior parts with nationwide COD.",
    metaKeywords: [
      "car interior accessories",
      "interior upgrade pakistan",
      "cabin accessories",
    ],
  },
  "steering-wheel-covers": {
    metaTitle: "Steering Wheel Covers | CrazzyCars.pk",
    metaDescription:
      "Leather-finish steering wheel covers for better grip and a refreshed cabin look — universal sizing, easy self-fit. Cash on Delivery nationwide.",
    metaKeywords: [
      "steering wheel cover pakistan",
      "leather steering cover",
      "car steering grip",
    ],
  },
  "multimedia-steering-controls": {
    metaTitle: "Multimedia Steering Controls | CrazzyCars.pk",
    metaDescription:
      "Bluetooth steering-mounted controls to answer calls and control music without leaving the wheel — plug-and-play install. COD nationwide.",
    metaKeywords: [
      "steering multimedia control",
      "bluetooth steering control pakistan",
    ],
  },
};

/** Hand-written unique SEO for remaining categories (not in calibration table). */
const GENERATED = {
  "led-lighting": {
    metaTitle: "Car LED Lights & Lighting in Pakistan | CrazzyCars.pk",
    metaDescription:
      "Brighten every drive with SOS flashers, LED headlights, indicators and cabin lights — plug-and-play kits for Pakistani cars. Cash on delivery nationwide.",
    metaKeywords: [
      "car led lights pakistan",
      "sos flasher",
      "led headlights",
      "car indicators",
      "ambient led",
    ],
  },
  "carbon-fiber": {
    metaTitle: "Carbon Fiber Car Accessories Pakistan | CrazzyCars.pk",
    metaDescription:
      "Genuine-look carbon fiber trims, mirror covers and interior accents that add a race-ready finish — built for Honda, Toyota & Hyundai. COD available.",
    metaKeywords: [
      "carbon fiber accessories",
      "carbon fiber trims pakistan",
      "civic carbon fiber",
      "corolla carbon interior",
    ],
  },
  "car-care-safety": {
    metaTitle: "Car Care & Safety Products in Pakistan | CrazzyCars.pk",
    metaDescription:
      "Keep your car clean and road-ready with wash kits, polish, emergency gear and safety essentials — trusted products, Cash on Delivery across Pakistan.",
    metaKeywords: [
      "car care products pakistan",
      "car cleaning",
      "car safety kit",
      "emergency accessories",
    ],
  },
  gadgets: {
    metaTitle: "Car Gadgets Online in Pakistan | CrazzyCars.pk",
    metaDescription:
      "Smart car gadgets — dash cams, jump starters, HUD displays, chargers and more for safer, smarter drives. Nationwide shipping with Cash on Delivery.",
    metaKeywords: [
      "car gadgets pakistan",
      "dash cam pakistan",
      "car electronics",
      "jump starter",
    ],
  },
  fragrances: {
    metaTitle: "Car Fragrances & Perfumes in Pakistan | CrazzyCars.pk",
    metaDescription:
      "Dashboard, hanging and AC-vent car fragrances that keep your cabin fresh for weeks — premium scents with easy clip-on install. COD nationwide.",
    metaKeywords: [
      "car fragrance pakistan",
      "car perfume",
      "dashboard perfume",
      "hanging air freshener",
    ],
  },
  "universal-accessories": {
    metaTitle: "Universal Car Accessories in Pakistan | CrazzyCars.pk",
    metaDescription:
      "Universal-fit accessories that suit almost any car — covers, chargers, styling kits and cabin upgrades. Easy install, Cash on Delivery nationwide.",
    metaKeywords: [
      "universal car accessories",
      "universal fit pakistan",
      "car accessories online",
    ],
  },
  "sos-flasher-led-lights": {
    metaTitle: "SOS & Flasher LED Lights | CrazzyCars.pk",
    metaDescription:
      "Police-style SOS strobes and grille flashers in red, blue and amber — high-visibility warning lights with simple wiring. Cash on Delivery nationwide.",
    metaKeywords: [
      "sos flasher pakistan",
      "police strobe lights",
      "grille flasher led",
      "emergency led lights",
    ],
  },
  "led-headlights-bulbs": {
    metaTitle: "LED Headlights & Bulbs | CrazzyCars.pk",
    metaDescription:
      "Brighter night drives with plug-and-play LED headlight bulbs — cooler running and clearer beam patterns for popular Pakistani cars. COD available.",
    metaKeywords: [
      "led headlights pakistan",
      "car led bulbs",
      "h4 led bulb",
      "headlight upgrade",
    ],
  },
  "led-indicator-lights": {
    metaTitle: "LED Indicator Lights | CrazzyCars.pk",
    metaDescription:
      "Sharp LED side markers and turn indicators that replace dull stock bulbs — smoke and clear lens options. Easy fit, ships nationwide with COD.",
    metaKeywords: [
      "led indicator pakistan",
      "side marker lights",
      "turn signal led",
      "fender indicator",
    ],
  },
  "backlights-tail-lamps": {
    metaTitle: "Backlights & Tail Lamps | CrazzyCars.pk",
    metaDescription:
      "LED tail lamp upgrades that modernize your rear end — brighter brake and reverse lighting for safer night driving. Cash on Delivery nationwide.",
    metaKeywords: [
      "tail lamps pakistan",
      "led backlight",
      "rear light upgrade",
      "brake light led",
    ],
  },
  "fog-lamps-drl-covers": {
    metaTitle: "Fog Lamps & DRL Covers | CrazzyCars.pk",
    metaDescription:
      "Fog lamp bezels and DRL covers that finish your front fascia — direct-fit pieces for a cleaner aftermarket look. Nationwide COD.",
    metaKeywords: [
      "fog lamp cover pakistan",
      "drl cover",
      "fog light bezel",
      "daytime running light",
    ],
  },
  "led-sill-plates": {
    metaTitle: "LED Sill Plates | CrazzyCars.pk",
    metaDescription:
      "Illuminated door sill plates that light up when you open the door — welcome-light branding with scratch protection. Easy wire-in, COD nationwide.",
    metaKeywords: [
      "led sill plate pakistan",
      "door sill lights",
      "welcome light plate",
      "scuff plate led",
    ],
  },
  "rear-reflectors": {
    metaTitle: "Rear Reflectors | CrazzyCars.pk",
    metaDescription:
      "OEM-style rear reflectors and bumper light accents that restore or upgrade your rear visibility — direct-fit for popular models. COD across Pakistan.",
    metaKeywords: [
      "rear reflector pakistan",
      "bumper reflector",
      "car rear light",
      "reflector lens",
    ],
  },
  "floor-mats": {
    metaTitle: "Car Floor Mats in Pakistan | CrazzyCars.pk",
    metaDescription:
      "Custom-fit TPE and carpet floor mats that trap mud and spills — model-specific sets for Honda, Toyota, Suzuki & Kia. Cash on Delivery nationwide.",
    metaKeywords: [
      "car floor mats pakistan",
      "tpe floor mats",
      "custom fit mats",
      "3d floor mats",
    ],
  },
  "luxury-7d-9d-floor-mats": {
    metaTitle: "Luxury 7D / 9D Floor Mats | CrazzyCars.pk",
    metaDescription:
      "Full-coverage 7D and 9D luxury mats with raised edges that seal the footwell — waterproof, easy to wipe clean. Model-fit options, COD nationwide.",
    metaKeywords: [
      "7d floor mats pakistan",
      "9d floor mats",
      "luxury car mats",
      "waterproof floor mats",
    ],
  },
  "dashboard-mats": {
    metaTitle: "Dashboard Mats | CrazzyCars.pk",
    metaDescription:
      "Velvet anti-slip dashboard mats that cut glare and protect against sun fade — custom cut for Corolla, Civic, City & Alto. Ships with COD.",
    metaKeywords: [
      "dashboard mat pakistan",
      "dash cover",
      "velvet dashboard mat",
      "anti slip dash mat",
    ],
  },
  "trunk-mats": {
    metaTitle: "Trunk Mats | CrazzyCars.pk",
    metaDescription:
      "Waterproof trunk mats that protect cargo floors from dirt and spills — snug custom-fit liners for sedan and hatch models. Cash on Delivery.",
    metaKeywords: [
      "trunk mat pakistan",
      "boot liner",
      "cargo mat",
      "car trunk cover",
    ],
  },
  "seat-covers": {
    metaTitle: "Car Seat Covers in Pakistan | CrazzyCars.pk",
    metaDescription:
      "Leatherette and fabric seat covers that refresh tired upholstery — full sets with airbag-safe stitching for daily drivers. COD nationwide.",
    metaKeywords: [
      "seat covers pakistan",
      "car seat cover set",
      "leatherette seat cover",
      "universal seat cover",
    ],
  },
  "seat-belt-accessories": {
    metaTitle: "Seat Belt Accessories | CrazzyCars.pk",
    metaDescription:
      "Seat belt pads, clips and covers that soften shoulder pressure and tidy loose belts — quick clip-on comfort upgrades. Nationwide COD.",
    metaKeywords: [
      "seat belt pad pakistan",
      "seat belt cover",
      "shoulder pad car",
      "seat belt clip",
    ],
  },
  "car-curtains": {
    metaTitle: "Car Curtains | CrazzyCars.pk",
    metaDescription:
      "Magnetic and rail car curtains that block harsh sun and add rear privacy — ideal for family and ride-hailing cars. Cash on Delivery nationwide.",
    metaKeywords: [
      "car curtains pakistan",
      "magnetic car curtains",
      "window privacy curtains",
      "sun block curtains",
    ],
  },
  "sun-shades": {
    metaTitle: "Car Sun Shades | CrazzyCars.pk",
    metaDescription:
      "Foldable windshield and side sun shades that drop cabin heat fast — compact storage, universal and model-fit sizes. COD across Pakistan.",
    metaKeywords: [
      "car sun shade pakistan",
      "windshield shade",
      "side window shade",
      "heat blocker",
    ],
  },
  "interior-lights": {
    metaTitle: "Interior Ambient Lights | CrazzyCars.pk",
    metaDescription:
      "RGB and white ambient interior lights that glow along footwells and dash lines — USB and hardwire kits for any cabin. Cash on Delivery.",
    metaKeywords: [
      "interior lights pakistan",
      "ambient car lighting",
      "rgb footwell lights",
      "cabin led strip",
    ],
  },
  "arm-rests-console-boxes": {
    metaTitle: "Arm Rests & Console Boxes | CrazzyCars.pk",
    metaDescription:
      "Center armrests and console organizers with padded lids and hidden storage — elevates comfort on long Pakistani highways. COD nationwide.",
    metaKeywords: [
      "car armrest pakistan",
      "console box",
      "center arm rest",
      "car storage box",
    ],
  },
  "shift-knob-accessories": {
    metaTitle: "Shift Knob Accessories | CrazzyCars.pk",
    metaDescription:
      "Sport shift knobs, gaiters and trim rings that refresh your gear surround — threaded and clip-fit options. Easy swap, COD nationwide.",
    metaKeywords: [
      "shift knob pakistan",
      "gear knob",
      "manual shift knob",
      "carbon shift knob",
    ],
  },
  "back-neck-care": {
    metaTitle: "Back & Neck Care Car Pillows | CrazzyCars.pk",
    metaDescription:
      "Memory-foam lumbar and neck pillows that ease long-drive fatigue — breathable covers for daily commuting comfort. Cash on Delivery nationwide.",
    metaKeywords: [
      "car neck pillow pakistan",
      "lumbar support car",
      "back cushion driving",
      "headrest pillow",
    ],
  },
  ashtrays: {
    metaTitle: "Car Ashtrays | CrazzyCars.pk",
    metaDescription:
      "Portable cup-holder ashtrays with lids that contain ash and odor — LED and plain styles for a tidier cabin. Ships nationwide with COD.",
    metaKeywords: [
      "car ashtray pakistan",
      "cup holder ashtray",
      "portable ashtray",
      "car smoking accessory",
    ],
  },
  "tissue-boxes": {
    metaTitle: "Car Tissue Boxes | CrazzyCars.pk",
    metaDescription:
      "Leather-look tissue box covers that sit neatly on the rear parcel or console — keeps tissues handy without looking messy. COD nationwide.",
    metaKeywords: [
      "car tissue box pakistan",
      "tissue holder car",
      "leather tissue cover",
      "cabin organizer",
    ],
  },
  "mirror-hangings": {
    metaTitle: "Mirror Hangings | CrazzyCars.pk",
    metaDescription:
      "Rear-view mirror hangings and charms that personalize your cabin — lightweight designs that won't block your view. Cash on Delivery.",
    metaKeywords: [
      "mirror hanging pakistan",
      "car mirror charm",
      "rear view hanging",
      "car decoration",
    ],
  },
  "air-freshener-decoration": {
    metaTitle: "Air Freshener & Decorations | CrazzyCars.pk",
    metaDescription:
      "Decorative cabin fresheners and accent pieces that scent and style your interior — clip, hang and dash-mount options. COD across Pakistan.",
    metaKeywords: [
      "air freshener decoration",
      "cabin scent decor",
      "car decoration pakistan",
      "dash freshener",
    ],
  },
  "carbon-fiber-accessories": {
    metaTitle: "Carbon Fiber Accessories – Carbon Fiber | CrazzyCars.pk",
    metaDescription:
      "Interior and exterior carbon-look accessories — trim wraps, knobs and covers for a cohesive sport finish. Nationwide Cash on Delivery.",
    metaKeywords: [
      "carbon fiber accessories pakistan",
      "carbon trim kit",
      "carbon look parts",
      "cf car accessories",
    ],
  },
  "car-care-cleaning": {
    metaTitle: "Car Care & Cleaning Kits | CrazzyCars.pk",
    metaDescription:
      "All-in-one cleaning kits with washes, cloths and detail tools for weekend detailing at home — shine without a workshop. COD nationwide.",
    metaKeywords: [
      "car cleaning kit pakistan",
      "car care kit",
      "detailing kit",
      "car wash set",
    ],
  },
  "all-purpose-cleaners": {
    metaTitle: "All Purpose Car Cleaners | CrazzyCars.pk",
    metaDescription:
      "Multi-surface cleaners that cut grease on dash, plastic and door cards without sticky residue — cabin-safe formulas. Cash on Delivery.",
    metaKeywords: [
      "all purpose cleaner car",
      "interior cleaner pakistan",
      "multi surface car cleaner",
    ],
  },
  "car-polish-wax": {
    metaTitle: "Car Polish & Wax | CrazzyCars.pk",
    metaDescription:
      "Polish and wax formulas that restore gloss and add UV protection — hand-apply or machine-buff for showroom shine. COD nationwide.",
    metaKeywords: [
      "car polish pakistan",
      "car wax",
      "paint polish",
      "gloss wax",
    ],
  },
  "scratch-swirl-restore": {
    metaTitle: "Scratch & Swirl Restore | CrazzyCars.pk",
    metaDescription:
      "Scratch removers and swirl correctors that fade light paint marks before they rust — DIY paint rescue in a bottle. Ships with COD.",
    metaKeywords: [
      "scratch remover pakistan",
      "swirl remover",
      "paint restore",
      "car scratch fix",
    ],
  },
  "engine-cleaners": {
    metaTitle: "Engine Cleaners | CrazzyCars.pk",
    metaDescription:
      "Degreasers and engine bay cleaners that dissolve oil film safely around plastics and wiring — rinse-ready formulas. Cash on Delivery.",
    metaKeywords: [
      "engine cleaner pakistan",
      "engine degreaser",
      "bay cleaner",
      "motor wash",
    ],
  },
  "shampoo-foam": {
    metaTitle: "Car Shampoo & Foam | CrazzyCars.pk",
    metaDescription:
      "pH-balanced car shampoos and snow foams that lift dirt without stripping wax — thick foam for safer hand washes. COD nationwide.",
    metaKeywords: [
      "car shampoo pakistan",
      "snow foam",
      "car wash soap",
      "foam cannon soap",
    ],
  },
  "windshield-glass-wash": {
    metaTitle: "Windshield & Glass Wash | CrazzyCars.pk",
    metaDescription:
      "Glass cleaners and washer fluid additives that clear haze and road film for sharper night visibility. Easy spray-on, COD across Pakistan.",
    metaKeywords: [
      "glass cleaner pakistan",
      "windshield wash",
      "car glass cleaner",
      "washer fluid",
    ],
  },
  "wheel-tyre-care": {
    metaTitle: "Wheel & Tyre Care | CrazzyCars.pk",
    metaDescription:
      "Wheel cleaners, tyre shine and rim protectors that blacken sidewalls and cut brake dust — weekend-ready wheel care. Cash on Delivery.",
    metaKeywords: [
      "tyre shine pakistan",
      "wheel cleaner",
      "rim care",
      "tire dressing",
    ],
  },
  "microfiber-accessories": {
    metaTitle: "Microfiber Accessories | CrazzyCars.pk",
    metaDescription:
      "Soft microfiber towels, applicators and mitts that dry paint safely without swirls — must-have detailing staples. COD nationwide.",
    metaKeywords: [
      "microfiber towel pakistan",
      "car drying towel",
      "detailing mitt",
      "microfiber cloth",
    ],
  },
  "polisher-machines-buffers": {
    metaTitle: "Polisher Machines & Buffers | CrazzyCars.pk",
    metaDescription:
      "Dual-action polishers and buffer pads for DIY paint correction — smoother finishes than hand rubbing alone. Nationwide COD.",
    metaKeywords: [
      "car polisher pakistan",
      "dual action polisher",
      "buffer machine",
      "paint correction tool",
    ],
  },
  "pressure-washers": {
    metaTitle: "Pressure Washers | CrazzyCars.pk",
    metaDescription:
      "Compact pressure washers that blast mud from arches and underbody — home driveway cleaning without a wash bay. Cash on Delivery.",
    metaKeywords: [
      "pressure washer pakistan",
      "car pressure washer",
      "home car wash",
      "high pressure cleaner",
    ],
  },
  "emergency-safety": {
    metaTitle: "Emergency & Safety Car Kits | CrazzyCars.pk",
    metaDescription:
      "Roadside emergency kits, triangles and safety gear so you're prepared for breakdowns and night stops. Ships nationwide with COD.",
    metaKeywords: [
      "car emergency kit pakistan",
      "roadside safety",
      "warning triangle",
      "car safety gear",
    ],
  },
  "dash-cameras": {
    metaTitle: "Dash Cameras in Pakistan | CrazzyCars.pk",
    metaDescription:
      "Front and dual dash cams that record clear evidence day and night — loop recording with easy windscreen mount. Cash on Delivery.",
    metaKeywords: [
      "dash cam pakistan",
      "car camera",
      "front dash camera",
      "dual dash cam",
    ],
  },
  "android-lcd-panels": {
    metaTitle: "Android LCD Panels | CrazzyCars.pk",
    metaDescription:
      "Android head-unit LCD panels with navigation, Bluetooth and reverse-cam support — modernize older dashboards. COD nationwide.",
    metaKeywords: [
      "android lcd pakistan",
      "car android screen",
      "head unit lcd",
      "car stereo android",
    ],
  },
  "mobile-holders-chargers": {
    metaTitle: "Mobile Holders & Chargers | CrazzyCars.pk",
    metaDescription:
      "Phone mounts and fast car chargers that keep maps visible and batteries topped up on every trip. Clip or vent fit, COD nationwide.",
    metaKeywords: [
      "mobile holder pakistan",
      "car phone mount",
      "car charger",
      "vent phone holder",
    ],
  },
  "jump-starters-booster-cables": {
    metaTitle: "Jump Starters & Booster Cables | CrazzyCars.pk",
    metaDescription:
      "Portable jump starters and heavy-duty booster cables that revive flat batteries without waiting for a tow. Cash on Delivery.",
    metaKeywords: [
      "jump starter pakistan",
      "booster cables",
      "portable car battery",
      "power bank jump start",
    ],
  },
  "power-inverters": {
    metaTitle: "Car Power Inverters | CrazzyCars.pk",
    metaDescription:
      "12V to 220V power inverters that run laptops and small appliances from your cigarette socket — travel power on tap. COD nationwide.",
    metaKeywords: [
      "power inverter pakistan",
      "car inverter 12v",
      "cigarette socket inverter",
      "travel inverter",
    ],
  },
  "air-compressors-inflators": {
    metaTitle: "Air Compressors & Inflators | CrazzyCars.pk",
    metaDescription:
      "Digital tyre inflators that hit the right PSI at the roadside — compact 12V compressors for cars and bikes. Cash on Delivery.",
    metaKeywords: [
      "tyre inflator pakistan",
      "car air compressor",
      "digital tyre pump",
      "12v inflator",
    ],
  },
  "key-covers-key-chains": {
    metaTitle: "Key Covers & Key Chains | CrazzyCars.pk",
    metaDescription:
      "Soft key fob covers and metal key chains that protect buttons and add a branded touch — model-fit sleeves available. COD nationwide.",
    metaKeywords: [
      "key cover pakistan",
      "car key fob cover",
      "key chain car",
      "remote key case",
    ],
  },
  "security-gadgets": {
    metaTitle: "Car Security Gadgets | CrazzyCars.pk",
    metaDescription:
      "Alarms, locks and anti-theft gadgets that deter break-ins — practical security add-ons for city parking. Ships with Cash on Delivery.",
    metaKeywords: [
      "car security pakistan",
      "anti theft gadget",
      "car alarm",
      "steering lock",
    ],
  },
  "ac-grill-perfumes": {
    metaTitle: "AC Grill Perfumes | CrazzyCars.pk",
    metaDescription:
      "Clip-on AC grill perfumes that circulate scent whenever the blower runs — refillable and solid-gel options. COD across Pakistan.",
    metaKeywords: [
      "ac grill perfume",
      "vent perfume pakistan",
      "car ac freshener",
      "clip on perfume",
    ],
  },
  "dashboard-perfumes": {
    metaTitle: "Dashboard Perfumes | CrazzyCars.pk",
    metaDescription:
      "Dashboard bottle and gel perfumes with a premium look that scent the cabin for weeks — spill-resistant bases. Cash on Delivery.",
    metaKeywords: [
      "dashboard perfume pakistan",
      "car gel perfume",
      "dash scent bottle",
      "cabin fragrance",
    ],
  },
  "hanging-perfumes": {
    metaTitle: "Hanging Car Perfumes | CrazzyCars.pk",
    metaDescription:
      "Mirror-hanging car perfumes and scent cards that freshen every ride — light enough not to swing wildly on rough roads. Cash on Delivery nationwide.",
    metaKeywords: [
      "hanging perfume pakistan",
      "mirror perfume",
      "car scent card",
      "hanging freshener",
    ],
  },
  "fancy-air-fresheners": {
    metaTitle: "Fancy Air Fresheners | CrazzyCars.pk",
    metaDescription:
      "Designer-style fancy air fresheners that double as cabin décor — unique shapes and long-lasting fragrance oils. Cash on Delivery.",
    metaKeywords: [
      "fancy air freshener",
      "designer car perfume",
      "decorative freshener pakistan",
      "luxury car scent",
    ],
  },
};

function fitTitle(main) {
  const max = 60;
  const budget = max - BRAND_SUFFIX.length;
  let m = String(main || "").trim();
  if (m.length <= budget) return m + BRAND_SUFFIX;
  // Trim on word boundary when possible
  m = m.slice(0, budget);
  const lastSpace = m.lastIndexOf(" ");
  if (lastSpace > budget * 0.55) m = m.slice(0, lastSpace);
  return m.trimEnd() + BRAND_SUFFIX;
}

function fitDescription(text) {
  let d = String(text || "").replace(/\s+/g, " ").trim();
  if (d.length > 160) {
    d = d.slice(0, 157).replace(/\s+\S*$/, "").trimEnd() + "…";
  }
  return d;
}

const MIN_KEYWORDS = 10;
const MAX_KEYWORDS = 15;

function normalizeKeywords(list, { min = MIN_KEYWORDS, max = MAX_KEYWORDS } = {}) {
  const out = [];
  const seen = new Set();
  for (const raw of list || []) {
    const k = String(raw || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
    if (out.length >= max) break;
  }
  return out;
}

/** Pad category keywords to 10–15 with unique, relevant search phrases. */
function expandKeywords(baseList, cat, parentName) {
  const name = String(cat?.name || cat?.slug || "").trim();
  const nameLc = name.toLowerCase();
  const parentLc = String(parentName || "").trim().toLowerCase();
  const slugWords = String(cat?.slug || "")
    .split("-")
    .filter((w) => w && w.length > 2 && !["and", "the", "for"].includes(w));

  const extras = [
    nameLc,
    `${nameLc} pakistan`,
    `buy ${nameLc} online`,
    `${nameLc} online pakistan`,
    `${nameLc} price pakistan`,
    `${nameLc} karachi`,
    `${nameLc} lahore`,
    `${nameLc} islamabad`,
    parentLc ? `${parentLc} accessories` : "car accessories pakistan",
    parentLc ? `${nameLc} ${parentLc}` : null,
    "car accessories pakistan",
    "crazzycars",
    "crazzycars.pk",
    "cash on delivery pakistan",
    "cod nationwide",
    "honda toyota suzuki",
    "car modification pakistan",
    "auto accessories pakistan",
    ...slugWords.map((w) => `${w} pakistan`),
    ...slugWords.map((w) => `car ${w}`),
  ].filter(Boolean);

  return normalizeKeywords([...(baseList || []), ...extras], {
    min: MIN_KEYWORDS,
    max: MAX_KEYWORDS,
  });
}

function buildFallback(cat, parentName) {
  const name = cat.name || cat.slug;
  const isRoot = !parentName;
  const titleMain = isRoot
    ? `${name} in Pakistan`
    : `${name} – ${parentName}`;
  const metaTitle = fitTitle(titleMain);
  const metaDescription = fitDescription(
    `Shop ${name}${parentName ? ` under ${parentName}` : ""} at CrazzyCars.pk — quality fitment for Pakistani cars with Cash on Delivery nationwide.`
  );
  const metaKeywords = expandKeywords(
    [
      name.toLowerCase(),
      `${name.toLowerCase()} pakistan`,
      parentName ? parentName.toLowerCase() : "car accessories",
      "crazzycars",
      "cash on delivery",
      "pakistan",
    ],
    cat,
    parentName
  );
  return { metaTitle, metaDescription, metaKeywords };
}

function resolveSeo(cat, parentName) {
  const slug = cat.slug;
  const source = CALIBRATED[slug] || GENERATED[slug] || null;
  if (source) {
    return {
      metaTitle: source.metaTitle.length <= 60 ? source.metaTitle : fitTitle(source.metaTitle.replace(BRAND_SUFFIX, "")),
      metaDescription: fitDescription(source.metaDescription),
      metaKeywords: expandKeywords(source.metaKeywords, cat, parentName),
      source: CALIBRATED[slug] ? "calibrated" : "generated",
    };
  }
  return { ...buildFallback(cat, parentName), source: "fallback" };
}

function printTable(rows) {
  console.log("\nslug\tsource\ttitleLen\tdescLen\tmetaTitle\tmetaDescription\tkeywords");
  for (const r of rows) {
    console.log(
      [
        r.slug,
        r.source,
        r.metaTitle.length,
        r.metaDescription.length,
        JSON.stringify(r.metaTitle),
        JSON.stringify(r.metaDescription),
        r.metaKeywords.join("; "),
      ].join("\t")
    );
  }
}

async function run() {
  if (!MONGO_URI) {
    console.error("Set MONGO_URI or MONGODB_URI in .env.local first.");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log(`Connected${DRY_RUN ? " (DRY RUN — no writes)" : ""}`);

  const cats = await Category.find({})
    .select("name slug parentCategory parents level seo")
    .lean();

  const byId = Object.fromEntries(cats.map((c) => [String(c._id), c]));
  const rows = [];
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const cat of cats) {
    const parentId = cat.parentCategory
      ? String(cat.parentCategory)
      : cat.parents?.[0]
        ? String(cat.parents[0])
        : "";
    const parent = parentId ? byId[parentId] : null;
    const seo = resolveSeo(cat, parent?.name || "");

    rows.push({
      slug: cat.slug,
      name: cat.name,
      parent: parent?.slug || "(root)",
      ...seo,
    });

    if (DRY_RUN) continue;

    try {
      await Category.updateOne(
        { _id: cat._id },
        {
          $set: {
            "seo.metaTitle": seo.metaTitle,
            "seo.metaDescription": seo.metaDescription,
            "seo.metaKeywords": seo.metaKeywords,
          },
        }
      );
      updated += 1;
    } catch (err) {
      errors += 1;
      console.error(`ERROR ${cat.slug}:`, err.message);
    }
  }

  // Sort for readable review
  rows.sort((a, b) => a.slug.localeCompare(b.slug));
  printTable(rows);

  const overTitle = rows.filter((r) => r.metaTitle.length > 60);
  const shortDesc = rows.filter((r) => r.metaDescription.length < 120);
  const longDesc = rows.filter((r) => r.metaDescription.length > 160);
  const shortKw = rows.filter((r) => r.metaKeywords.length < 10);
  const okKw = rows.filter((r) => r.metaKeywords.length >= 10 && r.metaKeywords.length <= 15);

  console.log("\n—— Summary ——");
  console.log(`Categories: ${rows.length}`);
  console.log(`Calibrated: ${rows.filter((r) => r.source === "calibrated").length}`);
  console.log(`Generated:  ${rows.filter((r) => r.source === "generated").length}`);
  console.log(`Fallback:   ${rows.filter((r) => r.source === "fallback").length}`);
  console.log(`Titles >60: ${overTitle.length}${overTitle.length ? " → " + overTitle.map((r) => r.slug).join(", ") : ""}`);
  console.log(`Desc <120:  ${shortDesc.length}${shortDesc.length ? " → " + shortDesc.map((r) => `${r.slug}(${r.metaDescription.length})`).join(", ") : ""}`);
  console.log(`Desc >160:  ${longDesc.length}${longDesc.length ? " → " + longDesc.map((r) => `${r.slug}(${r.metaDescription.length})`).join(", ") : ""}`);
  console.log(`Keywords 10–15: ${okKw.length}/${rows.length}`);
  console.log(`Keywords <10: ${shortKw.length}${shortKw.length ? " → " + shortKw.map((r) => `${r.slug}(${r.metaKeywords.length})`).join(", ") : ""}`);
  if (!DRY_RUN) {
    console.log(`Updated: ${updated}  Skipped: ${skipped}  Errors: ${errors}`);
  } else {
    console.log("Dry run only — re-run without --dry-run to write.");
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("seed-category-seo failed:", err);
  process.exit(1);
});
