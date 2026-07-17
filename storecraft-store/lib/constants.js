export const JWT_COOKIE_NAME = "admin_token";
/** HttpOnly JWT for logged-in storefront customers (middleware + APIs). */
export const STORE_JWT_COOKIE_NAME = "customer_token";
/** Previous cookie name; still cleared on logout and accepted until clients refresh. */
export const STORE_JWT_COOKIE_NAME_LEGACY = "store_token";
export const USER_ROLES = ["superadmin", "admin", "editor", "viewer"];
export const USER_STATUSES = ["active", "inactive"];
export const STORE_CURRENCY = "PKR";
export const STORE_COUNTRY = "Pakistan";
export const STORE_WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP || "";
export const STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk";
export const ORDER_NUMBER_PREFIX = "SM";
export const ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"];
export const PAYMENT_STATUSES = ["unpaid", "paid", "refunded", "partial", "failed"];

export const PAKISTAN_PROVINCES = [
  "Punjab",
  "Sindh",
  "KPK",
  "Balochistan",
  "Gilgit-Baltistan",
  "AJK",
];

/** Checkout city dropdown (Pakistan). */
export const PAKISTAN_CHECKOUT_CITIES = [
  "Karachi",
  "Lahore",
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  "Multan",
  "Peshawar",
  "Quetta",
  "Sialkot",
  "Gujranwala",
  "Hyderabad",
  "Abbottabad",
  "Bahawalpur",
  "Sargodha",
  "Sukkur",
  "Larkana",
  "Sheikhupura",
  "Rahim Yar Khan",
  "Other",
];

export const STORE_PHONE_PREFIX = "+92";
export const STORE_COUNTRY_CODE = "PK";

export const PAKISTAN_CITIES = [
  "Lahore", "Faisalabad", "Rawalpindi", "Gujranwala", "Multan",
  "Bahawalpur", "Sargodha", "Sheikhupura", "Jhang",
  "Rahim Yar Khan", "Gujrat", "Sahiwal", "Wah Cantt", "Kasur",
  "Karachi", "Hyderabad", "Sukkur", "Larkana", "Nawabshah",
  "Mirpur Khas", "Khairpur", "Jacobabad",
  "Peshawar", "Mardan", "Mingora", "Kohat", "Abbottabad",
  "Mansehra", "Dera Ismail Khan",
  "Quetta", "Turbat", "Khuzdar", "Hub",
  "Islamabad",
  "Sialkot",
];

export const CAR_MAKES = ["Honda", "Toyota", "Suzuki", "Hyundai", "Haval"];

export const CAR_MODELS = {
  Honda: [
    { model: "Civic", generation: "Reborn", yearFrom: 2006, yearTo: 2012, slug: "honda-civic-reborn-2006-2012" },
    { model: "Civic", generation: "Rebirth", yearFrom: 2012, yearTo: 2016, slug: "honda-civic-rebirth-2012-2016" },
    { model: "Civic", generation: "X (10th Gen)", yearFrom: 2016, yearTo: 2021, slug: "honda-civic-x-2016-2021" },
    { model: "Civic", generation: "11th Gen", yearFrom: 2022, yearTo: null, slug: "honda-civic-11th-gen-2022-present" },
    { model: "City", generation: "5th Gen", yearFrom: 2016, yearTo: 2019, slug: "honda-city-2016-2019" },
    { model: "City", generation: "6th Gen", yearFrom: 2020, yearTo: null, slug: "honda-city-2020-present" },
  ],
  Toyota: [
    { model: "Corolla", generation: "E140", yearFrom: 2009, yearTo: 2014, slug: "toyota-corolla-e140-2009-2014" },
    { model: "Corolla", generation: "E170", yearFrom: 2014, yearTo: 2026, slug: "toyota-corolla-e170-2014-2026" },
  ],
  Suzuki: [
    { model: "Alto", generation: "8th Gen", yearFrom: 2020, yearTo: null, slug: "suzuki-alto-2020-present" },
    { model: "Swift", generation: "4th Gen (Z Series)", yearFrom: 2025, yearTo: null, slug: "suzuki-swift-2025-present" },
  ],
  Hyundai: [
    { model: "Elantra", generation: "CN7 (7th Gen)", yearFrom: 2020, yearTo: 2024, slug: "hyundai-elantra-2020-2024" },
    { model: "Elantra", generation: "CN7 Facelift Hybrid", yearFrom: 2025, yearTo: null, slug: "hyundai-elantra-hybrid-2025-present" },
    { model: "Sonata", generation: "DN8 (8th Gen)", yearFrom: 2020, yearTo: 2024, slug: "hyundai-sonata-2020-2024" },
  ],
  Haval: [
    { model: "H6", generation: "3rd Gen", yearFrom: 2021, yearTo: null, slug: "haval-h6-2021-present" },
  ],
};

export const ALL_CAR_MODELS = Object.entries(CAR_MODELS).flatMap(
  ([make, models]) => models.map((m) => ({ make, ...m }))
);

export const SHIPPING_ZONES = [
  {
    name: "Major Cities",
    rate: 0,
    cities: ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad"],
    description: "2-3 business days",
    freeShippingThreshold: 2999,
    estimatedDays: "2-3 business days",
  },
  {
    name: "Other Cities",
    rate: 150,
    cities: [
      "Multan",
      "Peshawar",
      "Quetta",
      "Sialkot",
      "Gujranwala",
      "Hyderabad",
      "Abbottabad",
      "Bahawalpur",
      "Sargodha",
      "Sukkur",
      "Larkana",
      "Sheikhupura",
      "Rahim Yar Khan",
      "Other",
    ],
    description: "3-5 business days",
    freeShippingThreshold: 2999,
    estimatedDays: "3-5 business days",
  },
  {
    name: "Remote Areas",
    rate: 300,
    cities: [],
    description: "5-7 business days",
    freeShippingThreshold: 5000,
    estimatedDays: "5-7 business days",
  },
];
