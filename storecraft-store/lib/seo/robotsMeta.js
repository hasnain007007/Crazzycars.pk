/** Explicit robots directives for storefront metadata. */

export const ROBOTS_INDEX_FOLLOW = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
  },
};

export const ROBOTS_NOINDEX_FOLLOW = {
  index: false,
  follow: true,
  googleBot: { index: false, follow: true },
};

export const ROBOTS_NOINDEX_NOFOLLOW = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
};
