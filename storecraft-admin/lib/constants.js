export const JWT_COOKIE_NAME = "admin_token";
export const STORE_JWT_COOKIE_NAME = "store_token";
export const USER_ROLES = ["superadmin", "admin", "editor", "viewer"];
export const USER_STATUSES = ["active", "inactive"];
export const STORE_CURRENCY = "PKR";
export const STORE_COUNTRY = "Pakistan";
export const STORE_WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP;
export const STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk';
export const ORDER_NUMBER_PREFIX = "CC";
export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "returned",
  "cancelled",
  "refunded",
  "disputed",
];
export const PAYMENT_STATUSES = ["unpaid", "paid", "refunded", "partial", "failed"];

export const PAKISTAN_PROVINCES = [
  "Punjab",
  "Sindh",
  "KPK",
  "Balochistan",
  "Gilgit-Baltistan",
  "AJK",
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
];

export const PRODUCT_CATEGORIES = [
  "Seat Covers",
  "Floor Mats",
  "Steering Covers",
  "Car Care",
  "LED Lights",
  "Phone Holders",
  "Air Fresheners",
  "Organizers",
  "Exterior Accessories",
  "Interior Accessories",
];

export const SHIPPING_ZONES = [
  {
    name: "Major Cities",
    rate: 0,
    cities: ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad"],
    description: "2-5 business days",
    freeShippingThreshold: 3000,
    estimatedDays: "2-5 business days",
  },
  {
    name: "Other Cities",
    rate: 150,
    description: "2-5 business days",
    freeShippingThreshold: 3000,
    estimatedDays: "2-5 business days",
  },
  {
    name: "Remote Areas",
    rate: 300,
    description: "4-7 business days",
    freeShippingThreshold: 5000,
    estimatedDays: "4-7 business days",
  },
];
