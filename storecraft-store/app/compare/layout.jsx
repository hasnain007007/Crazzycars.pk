import { ROBOTS_NOINDEX_NOFOLLOW } from "@/lib/seo/robotsMeta";

export const metadata = { robots: ROBOTS_NOINDEX_NOFOLLOW };

export default function CompareLayout({ children }) {
  return children;
}
