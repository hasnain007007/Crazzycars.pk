/**
 * Founder / owner identity — powers /founder, the About-page card, footer line and
 * the Person + Organization.founder structured data. Keep facts true and public-safe:
 * no personal phone, home address or CNIC here (complaints go through the official
 * WhatsApp line). Profiles verified in the owner's browser on 26 Nov 2026.
 */
import { STORE_POLICY } from "./store-policy.js";

const RETURNS_WINDOW_DAYS = STORE_POLICY.returns.windowDays;

export const FOUNDER = {
  name: "Hussnain Kamran",
  firstName: "Hussnain",
  jobTitle: "Founder",
  foundedYear: 2023,
  city: "Gujranwala",
  /** Real photo of the owner (from his LinkedIn, at his request). null → initials badge. Never AI. */
  photo: "/brand/founder-hussnain-kamran.jpg",
  photoAlt: "Hussnain Kamran, founder of CrazzyCars.pk",
  intro: [
    "Assalam-o-Alaikum, I'm Hussnain Kamran, the founder of CrazzyCars.pk.",
    "I started CrazzyCars in 2023 in Gujranwala so car owners across Pakistan can buy accessories that actually fit their car — body kits, LED lights and interior upgrades for cars like the Civic, Corolla, City, Swift and Alto — with honest photos, fitment help and delivery across Pakistan.",
    "I'm also a software engineer, and I built the CrazzyCars website, order tracking and delivery system myself, so every order can be followed from booking to your door.",
  ],
  /**
   * "My story" — the owner's own voice. Only true, general statements: no invented
   * anecdotes. Owner can replace any paragraph with his real memories.
   */
  storyTitle: "Why CrazzyCars matters to me",
  story: [
    "For most of us in Pakistan, a car is never just a machine. It is the first big thing a family saves for, the car that takes everyone to weddings and on Eid visits, the one you wash on Sunday morning and look back at after you park. When you want to make it a little more yours — a new spoiler, better lights, a cleaner interior — that wish deserves to be taken seriously.",
    "But buying car accessories online here has often meant guessing. Photos that don't match what arrives. Parts made for a different model. Sellers who reply quickly before you pay and go quiet after. I wanted to build the opposite of that: a shop where you know exactly what you are getting, for your exact car, from people who answer.",
    "That is why I started CrazzyCars from Gujranwala in 2023. As a software engineer, I built everything behind it myself — the website, the car-by-car fitment pages, order tracking and the delivery system — because I wanted every customer, anywhere in Pakistan, to be able to see where their order is at any moment.",
    "Every order that comes in is someone trusting a shop they have never visited, often with a booking advance in their hand. I never take that trust for granted. That is why my name, my face and my profiles are on this page. If something goes wrong, you don't have to wonder who is responsible — it is me, and I will make it right.",
  ],
  /** Only promises that match published store policy. */
  promises: [
    {
      title: "Ask before you buy",
      text: "Not sure it fits? Send your car model and year on WhatsApp and we'll confirm fitment before you order.",
    },
    {
      title: "Return if defective or wrong",
      text: `If a part arrives defective or is not what you ordered, tell us within ${RETURNS_WINDOW_DAYS} days and we'll sort it out.`,
    },
    {
      title: "Pay only to official accounts",
      text: "Booking advances go only to the accounts on our How to pay page. We never ask you to pay anywhere else.",
    },
  ],
  profiles: {
    linkedin: "https://www.linkedin.com/in/hussnainkamran/",
    /** Owner's personal Instagram (confirmed by the owner, 26 Nov 2026). null hides it. */
    instagram: "https://www.instagram.com/_muhammad_hasnain/",
  },
  /** Company profiles shown under "CrazzyCars online" (business, not personal). */
  companyProfiles: {
    linkedin: "https://www.linkedin.com/company/crazzycars-pk/",
  },
};

export const FOUNDER_PATH = "/founder";

/** Stable JSON-LD @id for the founder Person node. */
export function founderLdId(site) {
  return `${String(site || "").replace(/\/+$/, "")}${FOUNDER_PATH}#person`;
}

/** Public profile URLs for the Person node (only real, set values). */
export function founderSameAs() {
  return Object.values(FOUNDER.profiles).filter(Boolean);
}

/** "HK" — initials badge until a real photo is added. */
export function founderInitials() {
  return FOUNDER.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}
