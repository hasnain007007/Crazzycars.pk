/**
 * Converts a display string into a URL-safe kebab-case slug.
 */
export function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/["']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
