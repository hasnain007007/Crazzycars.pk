# Needs human review — catalog audit 2026-10-30

Things the fix script does **not** change, because the right answer cannot be derived from the data. Current values are from the live catalog (2026-10-30).

Already handled by `scripts/fix-catalog-2026-10.mjs` (after your GO): float-noise prices, fitment model names, 4 wrong-car fitments, 7 category moves. See DRY-RUN.md.

## 1. Prices — owner to decide (no price was changed)

| SKU | Product | Current | Question |
|---|---|---|---|
| CC-EXT-201 | [Universal Car Eyes Spoiler With Running Brake LED Lights (3Pcs)](https://crazzycars.pk/universal-car-eyes-spoiler-with-running-brake-led-lights-3pcs) | regular 6499, sale 8500 | Sale price is higher than regular, so customers pay the regular price and see no discount. Swap them (regular 8500, sale 6499) or set the real price? |
| CC-HCX-INT-STC-CF | [Honda Civic X 2016-2021 Carbon Steering Trim Cover](https://crazzycars.pk/honda-civic-x-2016-2021-carbon-steering-trim-cover) | regular 800, sale 899 | Same: sale above regular. Swap (regular 899, sale 800) or correct? |
| CC-ALT-EXT-TL-LAV-SMK-1 | [Suzuki Alto 660cc Lava Style Smoke Tail Lights Rear Lamps Pair](https://crazzycars.pk/suzuki-alto-660cc-lava-style-smoke-tail-lights-rear-lamps-pair) | regular 12000, sale 11999 | Rs 1 "discount" shows a sale badge. Set a real compare-at price or remove the sale price? |
| CC-UNI-AMB-DYN-10 | [Premium Dynamic Ambient Interior Lights Multi-Point](https://crazzycars.pk/premium-dynamic-ambient-interior-lights) | regular 14500, sale 6500 | 55% off — is Rs 14,500 a real former price? |
| CC-0068 | [Honda Civic 2022-2024 Yofer Style Body Kit 4PCS ABS](https://crazzycars.pk/honda-civic-2022-2024-yofer-style-body-kit-4pcs-abs) | regular 49999, sale 37999 | ABS Yofer kit Rs 37,999 vs the fibreglass one (CC-0067) Rs 15,999 with the same photos. Correct? |

Not a bug: products with no sale price (e.g. CC-0023, CC-0027, CC-0028, CC-0087, CC-0205, CC-EXT-107/108/109, Batman mirror covers, CC-UNI-LGT-POL-4X4R) simply have no discount. The site shows the regular price without a sale badge. Only add a sale price if there is a real one.

## 2. Photos — need a real photo of the exact item

**No photo at all (38)** — hide them until photos exist, or upload:

- CC-UNI-HUM-LSR-001 [Universal USB Car Humidifier with Atmosphere Light & Laser Roof Projection](https://crazzycars.pk/universal-usb-car-humidifier-atmosphere-light-laser-roof-light)
- CC-COR-BBL-RGB [Toyota Corolla X Dynamic Back Bumper Light RGB 2022-2023](https://crazzycars.pk/toyota-corolla-x-dynamic-back-bumper-light-rgb-2022-2023)
- CC-UNI-LED-DEYE [Universal Car Digital Eyes LED Panel Lights](https://crazzycars.pk/universal-car-digital-eyes-led-panel-lights)
- CC-UNI-LED-REFL [Universal Car LED Reflector Bumper Side Marker Light](https://crazzycars.pk/universal-car-led-reflector-bumper-side-marker-light)
- CC-PRI-LOUV-12 [Toyota Prius 2012 Quarter Glass Louvers Carbon Fiber Lamborghini Style](https://crazzycars.pk/toyota-prius-2012-quarter-glass-louvers-carbon-fiber)
- CC-KC-HONDACITY20092021 [Honda CITY 2009-2021 Premium Metal Key Cover](https://crazzycars.pk/honda-city-2009-2021-premium-metal-key-cover)
- CC-KC-SUZUKIALTO [Suzuki ALTO NEW Premium Metal Key Cover](https://crazzycars.pk/suzuki-alto-premium-metal-key-cover)
- CC-KC-NISSANNOTE [Nissan NOTE Premium Metal Key Cover](https://crazzycars.pk/nissan-note-premium-metal-key-cover)
- CC-KC-BAICBJ40 [BAIC BJ40 Premium Metal Key Cover](https://crazzycars.pk/baic-bj40-premium-metal-key-cover)
- CC-KC-CHERYTIGGO8PRO [Cherry Tiggo 8 PRO Premium Metal Key Cover](https://crazzycars.pk/chery-tiggo-8-pro-premium-metal-key-cover)
- CC-KC-CHERYTIGGO4PRO [Cherry Tiggo 4 PRO Premium Metal Key Cover](https://crazzycars.pk/chery-tiggo-4-pro-premium-metal-key-cover)
- CC-KC-SUZUKISWIFT [Suzuki Swift Premium Metal Key Cover](https://crazzycars.pk/suzuki-swift-premium-metal-key-cover)
- CC-KC-AUDIA4 [Audi A4 Premium Metal Key Cover](https://crazzycars.pk/audi-a4-premium-metal-key-cover)
- CC-KC-AUDIA5 [Audi A5 Premium Metal Key Cover](https://crazzycars.pk/audi-a5-premium-metal-key-cover)
- CC-KC-MERCEDESBENZE260 [Mercedes BENZ E260 Premium Metal Key Cover](https://crazzycars.pk/mercedes-benz-e260-premium-metal-key-cover)
- CC-KC-MERCEDESBENZECLASS [Mercedes Benz E Class Premium Metal Key Cover](https://crazzycars.pk/mercedes-benz-e-class-premium-metal-key-cover)
- CC-KC-HAVALH6 [Haval H6 Premium Metal Key Cover](https://crazzycars.pk/haval-h6-premium-metal-key-cover)
- CC-KC-KIASTONIC3BUTTON [KIA Stonic 3 Button Premium Metal Key Cover](https://crazzycars.pk/kia-stonic-3-button-premium-metal-key-cover)
- CC-KC-HYUNDAITUCSON [Hyundai Tucson Premium Metal Key Cover](https://crazzycars.pk/hyundai-tucson-premium-metal-key-cover)
- CC-KC-HYUNDAIELANTRA [Hyundai Elantra Premium Metal Key Cover](https://crazzycars.pk/hyundai-elantra-premium-metal-key-cover)
- CC-KC-HYUNDAISONATA [Hyundai Sonata Premium Metal Key Cover](https://crazzycars.pk/hyundai-sonata-premium-metal-key-cover)
- CC-KC-MGHS [MG HS Premium Metal Key Cover](https://crazzycars.pk/mg-hs-premium-metal-key-cover)
- CC-KC-OSHANX7 [Changan Oshan X7 Premium Metal Key Cover](https://crazzycars.pk/oshan-x7-premium-metal-key-cover)
- CC-KC-TOYOTAFORTUNER4BUTTO [Toyota Fortuner 4 Button Premium Metal Key Cover](https://crazzycars.pk/toyota-fortuner-4-button-premium-metal-key-cover)
- CC-KC-TOYOTAPRADO [Toyota Prado Premium Metal Key Cover](https://crazzycars.pk/toyota-prado-premium-metal-key-cover)
- CC-KC-TOYOTAYARIS [Toyota Yaris Premium Metal Key Cover](https://crazzycars.pk/toyota-yaris-premium-metal-key-cover)
- CC-KC-TOYOTAPRIUS [Toyota Prius NEW Premium Metal Key Cover](https://crazzycars.pk/toyota-prius-premium-metal-key-cover)
- CC-KC-KIASPORTAGEALPHA [KIA Sportage Alpha 3 Button Premium Metal Key Cover](https://crazzycars.pk/kia-sportage-alpha-premium-metal-key-cover)
- CC-KC-KIASORENTO3BUTTON [KIA Sorento 3 Button Premium Metal Key Cover](https://crazzycars.pk/kia-sorento-3-button-premium-metal-key-cover)
- CC-KC-HONDACIVIC2022 [Honda Civic 2022 Premium Metal Key Cover](https://crazzycars.pk/honda-civic-2022-premium-metal-key-cover)
- CC-KC-HONDAVEZEL [Honda Vezel 2013-2026 Premium Metal Key Cover](https://crazzycars.pk/honda-vezel-premium-metal-key-cover)
- CC-KC-HONDABRV [Honda BRV Premium Metal Key Cover](https://crazzycars.pk/honda-brv-premium-metal-key-cover)
- CC-KC-HONDACIVICREBIRTH [Honda Rebirth Premium Metal Key Cover](https://crazzycars.pk/honda-civic-rebirth-premium-metal-key-cover)
- CC-KC-TOYOTACOROLLAGRANDE [Toyota Corolla Grande NEW Premium Metal Key Cover](https://crazzycars.pk/toyota-corolla-grande-premium-metal-key-cover)
- CC-KC-KIASPORTAGEAWD [KIA Sportage AWD Premium Metal Key Cover](https://crazzycars.pk/kia-sportage-awd-premium-metal-key-cover)
- CC-KC-HONDACIVIC3BUTTON [Honda Civic 3 Button Premium Metal Key Cover](https://crazzycars.pk/honda-civic-3-button-premium-metal-key-cover)
- CC-KC-HONDACIVIC4BUTTON [Honda Civic 4 Button Premium Metal Key Cover](https://crazzycars.pk/honda-civic-4-button-premium-metal-key-cover)
- CC-KC-HONDACITY20223BUTTON [Honda CITY 2022 3 Button Premium Metal Key Cover](https://crazzycars.pk/honda-city-2022-3-button-premium-metal-key-cover)

**Placeholder image (5):**

- CC-KC-HONDACITY20092020 [Honda CITY 2009-2020 Premium Metal Key Cover](https://crazzycars.pk/honda-city-2009-2020-premium-metal-key-cover)
- CC-KC-PROTONX70 [Proton X70 Premium Metal Key Cover](https://crazzycars.pk/proton-x70-premium-metal-key-cover)
- CC-KC-GLORY580PRO [Glory 580 PRO Premium Metal Key Cover](https://crazzycars.pk/glory-580-pro-premium-metal-key-cover)
- CC-KC-CHANGANALSVIN [Changan Alsvin Premium Metal Key Cover](https://crazzycars.pk/changan-alsvin-premium-metal-key-cover)
- CC-KC-TOYOTAFORTUNER3BUTTO [Toyota Fortuner 3 Button Premium Metal Key Cover](https://crazzycars.pk/toyota-fortuner-3-button-premium-metal-key-cover)

**Wrong photo (checked visually by the auditor):**

- CC-VEZ-DRL-HD011 [Honda Vezel DRL Cover](https://crazzycars.pk/honda-vezel-2013-2018-fog-lamps-drl-cover-hd011-l2) shows OSRAM bulbs (the photo of CC-LGT-202).
- CC-0281 [Corolla Dashboard Trim 3PCS](https://crazzycars.pk/toyota-corolla-carbon-fiber-dashboard-trim-3pcs-lcd-2014-2026) shows the cup-holder/console piece (correct for CC-0280).

**Same photo on two listings — check each is right:**

- CC-0014 / CC-COR-RGB-KIT (RGB side style vs side style + bumper light kit)
- CC-COR-GRL-DIA-08 / CC-COR-GRL-SET-08 (diamond grille vs grille set)
- CC-0016 / CC-0017 / CC-0018 / CC-0019 paddle shifters (same design for 4 cars? then fine)
- CC-0067 / CC-0068 Yofer kit fibreglass vs ABS
- CC-0072 / CC-0075 Civic Reborn body kits
- CC-0081 / CC-0082 Civic spike splitter (with vs without canards)
- CC-INT-120 / CC-INT-132 Prius dashboard mats (two generations)

Only file names are wrong (photo is fine, no action needed): CC-0012, CC-0118, CC-0119, CC-0280. CC-0184 file name contains "copy" — check the photo shows the red-line side skirts.

## 3. Titles vs fitment — which is right?

| SKU | Title | Fitment now | Question |
|---|---|---|---|
| CC-EXT-135 | [Toyota Mark X ABS Roof Spoiler 2020-2022](https://crazzycars.pk/toyota-mark-x-abs-roof-spoiler-2020-2022) | Toyota Mark X 2004-2011 | Mark X production ended 2019; title years 2020-2022 look wrong. Change title to 2004-2009/2011? (slug stays the same) |
| CC-0063 | [Suzuki Swift 2022-2024 RS Style Body Kit Fibreglass](https://crazzycars.pk/suzuki-swift-2022-2024-rs-style-body-kit-fibreglass) | Suzuki Swift 2025- | Which Swift does this RS kit fit — 3rd gen (2018-2024) or new 4th gen (2025+)? |
| CC-INT-110 | [Suzuki Swift 2022-2026 Velvet Dashboard Mat](https://crazzycars.pk/suzuki-swift-2022-2026-velvet-dashboard-mat) | Suzuki 4th Gen (Z Series) 2025-2026 | Swift mat: title 2022-2026, fitment only 2025-2026. |
| CC-INT-147 | [Suzuki Swift 2022-2026 TPE Floor Mats Premium](https://crazzycars.pk/suzuki-swift-2022-2026-tpe-floor-mats-premium) | Suzuki 4th Gen (Z Series) 2025-2026 | Swift floor mats: same question. |
| CC-0065 | [Hyundai Elantra 2023-2026 Sporty Style Body Kit Fibreglass](https://crazzycars.pk/hyundai-elantra-2023-2026-sporty-style-body-kit-fibreglass) | Hyundai Elantra Hybrid 2025- | Elantra kit: title 2023-2026, fitment Elantra Hybrid 2025-2026 only. |
| CC-TVZ-EXT-SMC-CF | [Batman Style Side Mirror Cover – Toyota Vitz 2010-Present](https://crazzycars.pk/batman-style-side-mirror-cover-toyota-vitz-2010-present) | Toyota Vitz 2012- | Vitz: title 2010-Present, fitment 2012+. |
| CC-COR-BBL-RGB | [Toyota Corolla X Dynamic Back Bumper Light RGB 2022-2023](https://crazzycars.pk/toyota-corolla-x-dynamic-back-bumper-light-rgb-2022-2023) | Toyota E170–E210 2014-2026 | Title "Corolla X 2022-2023" but fitment 2014-2026 (and no photo). |
| CC-0018 | [Honda Civic X 2016-2021 Carbon Fiber Steering Wheel Paddle Shifters Pair](https://crazzycars.pk/honda-civic-x-2016-2021-carbon-fiber-steering-wheel-paddle-shifters-pair) | Honda Civic 2022-2026; Honda Civic 2016-2021 | Civic X paddle shifters also list Civic 2022-2026 (CC-0017 covers that). Remove 2022-2026? |
| CC-COR-BBL-2 | [Toyota Corolla RGB Dynamic Back Bumper Light](https://crazzycars.pk/toyota-corolla-rgb-dynamic-back-bumper-light) | Toyota Corolla 2014-2026; Toyota Corolla 2002-2008 | Lists 2014-2026 and 2002-2008; CC-COR-BBL-E120 covers 2002-2008. Does one part fit both? |
| CC-LGT-202 | [OSRAM Projector Lights 3 Colour Premium Quality](https://crazzycars.pk/osram-projector-lights-3-colour-premium-quality) | Toyota Corolla Cross 2020-2026; Toyota E140 2009-2014; Toyota E170–E210 2014-2026; Toyota E120 2002-2008; Toyota Corolla Axio 2014-2022; Honda Reborn 2006-2012; Honda Rebirth 2012-2016; Honda Civic X 2016-2021; Honda 11th Gen 2022-2026 | OSRAM bulbs list 9 specific cars — make it Universal? |
| CC-UNI-INT-GKN-TOY | [Universal Crystal LED Gear Knob – Touch Activated Premium Car Shifter](https://crazzycars.pk/universal-crystal-led-gear-knob-touch-activated-premium-car-shifter) | Honda Reborn 2006-2012; Honda Rebirth 2012-2016; Honda Civic X 2016-2021; Honda 11th Gen 2022-2026; Toyota E140 2009-2014; Toyota E170–E210 2014-2026; Toyota E120 2002-2008; Toyota Corolla Axio 2014-2022; Suzuki Alto 2020-2026; Suzuki Alto (Old) 2000-2012 | Title says Universal but fitment is a car list — mark Universal or drop the word? |

## 4. Possible duplicates — merge or keep both? (nothing deleted)

- CC-KC-HONDACITY20092020 [Honda CITY 2009-2020 Premium Metal Key Cover](https://crazzycars.pk/honda-city-2009-2020-premium-metal-key-cover) Rs 1799 ⇄ CC-KC-HONDACITY20092021 [Honda CITY 2009-2021 Premium Metal Key Cover](https://crazzycars.pk/honda-city-2009-2021-premium-metal-key-cover) Rs 1799
- CC-KC-MERCEDESBENZE260 [Mercedes BENZ E260 Premium Metal Key Cover](https://crazzycars.pk/mercedes-benz-e260-premium-metal-key-cover) Rs 2199 ⇄ CC-KC-MERCEDESBENZECLASS [Mercedes Benz E Class Premium Metal Key Cover](https://crazzycars.pk/mercedes-benz-e-class-premium-metal-key-cover) Rs 2199

## 5. Categories

- CC-0186 / CC-0187 / CC-0188 Corolla bundle deal packs have no category and there is no "Deals" category. Create one, or file them under Interior / Exterior?

## 6. Open-ended years (yearTo empty)

36 fitment rows (35 active products) have no end year (e.g. Alto 2020-, Corolla 2014-). That is how the car catalog marks a generation still on sale, and the website reads it as "to present". **Recommendation: keep as is** — writing 2026 would make them stop matching 2027 cars.
