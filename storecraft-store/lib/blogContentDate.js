/**
 * Stable blog modification date for JSON-LD / Open Graph / sitemap.
 * Never use view-bumped `updatedAt`.
 */
export function blogContentModifiedAt(post) {
  if (!post || typeof post !== "object") return null;
  return (
    post.contentUpdatedAt ||
    post.publishedAt ||
    post.createdAt ||
    null
  );
}
