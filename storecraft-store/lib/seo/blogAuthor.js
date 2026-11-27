/**
 * Blog bylines. Most posts were saved with the store name (or nothing) as author.
 * Google wants a real, named person behind articles, so a store-name author is
 * shown as the founder — the visible byline and the JSON-LD author must match.
 * A real person's name stored on the post is kept as-is.
 */
import { FOUNDER, FOUNDER_PATH, founderLdId, founderSameAs } from "../../config/founder.js";

const STORE_AUTHOR_RE = /^\s*(?:crazzy\s*cars?(?:\.pk)?|admin(?:istrator)?|team|staff|editor)?\s*$/i;

/** True for an empty author or a store / role name rather than a person. */
export function isStoreAuthorName(name) {
  return STORE_AUTHOR_RE.test(String(name ?? ""));
}

const FOUNDER_BYLINE_BIO =
  `Founder of CrazzyCars.pk. He started the store in ${FOUNDER.city} in ${FOUNDER.foundedYear} ` +
  "and built its website, car-by-car fitment pages and delivery tracking himself.";

/** @returns {{ name: string, bio: string, url: string, isFounder: boolean }} */
export function resolveBlogAuthor(author) {
  const name = String(author?.name || "").trim();
  if (name && !isStoreAuthorName(name) && name !== FOUNDER.name) {
    return { name, bio: String(author?.bio || "").trim(), url: "", isFounder: false };
  }
  return {
    name: FOUNDER.name,
    bio: String(author?.bio || "").trim() || FOUNDER_BYLINE_BIO,
    url: FOUNDER_PATH,
    isFounder: true,
  };
}

/** JSON-LD `author` for Article/BlogPosting; the founder links to the site-wide Person node. */
export function blogAuthorJsonLd(author, site) {
  const a = resolveBlogAuthor(author);
  if (!a.isFounder) return { "@type": "Person", name: a.name };
  const base = String(site || "").replace(/\/+$/, "");
  const sameAs = founderSameAs();
  return {
    "@type": "Person",
    "@id": founderLdId(base),
    name: FOUNDER.name,
    jobTitle: FOUNDER.jobTitle,
    url: `${base}${FOUNDER_PATH}`,
    ...(sameAs.length ? { sameAs } : {}),
  };
}
