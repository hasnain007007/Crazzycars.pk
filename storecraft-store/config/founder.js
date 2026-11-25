/**
 * Founder / owner identity — powers /founder, the About-page card, footer line and
 * the Person + Organization.founder structured data. Keep facts true and public-safe:
 * no personal phone, home address or CNIC here (complaints go through the official
 * WhatsApp line). Profiles verified in the owner's browser on 26 Nov 2026.
 */
export const FOUNDER = {
  name: "Hussnain Kamran",
  firstName: "Hussnain",
  jobTitle: "Founder",
  foundedYear: 2023,
  city: "Gujranwala",
  /** Real photo of the owner (e.g. "/brand/founder.jpg"). null → initials badge. Never AI. */
  photo: null,
  photoAlt: "Hussnain Kamran, founder of CrazzyCars.pk, at the shop in Gujranwala",
  intro: [
    "Assalam-o-Alaikum, I'm Hussnain Kamran, the founder of CrazzyCars.pk.",
    "I started CrazzyCars in 2023 in Gujranwala so car owners across Pakistan can buy accessories that actually fit their car — body kits, LED lights and interior upgrades for cars like the Civic, Corolla, City, Swift and Alto — with honest photos, fitment help and delivery across Pakistan.",
    "I'm also a software engineer, and I built the CrazzyCars website, order tracking and delivery system myself, so every order can be followed from booking to your door.",
  ],
  /** Only promises that match published store policy. */
  promises: [
    {
      title: "Ask before you buy",
      text: "Not sure it fits? Send your car model and year on WhatsApp and we'll confirm fitment before you order.",
    },
    {
      title: "7-day return if defective or wrong",
      text: "If a part arrives defective or is not what you ordered, tell us within 7 days and we'll sort it out.",
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
