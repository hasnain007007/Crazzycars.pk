import { ROBOTS_NOINDEX_NOFOLLOW } from "@/lib/seo/robotsMeta";

export const metadata = { robots: ROBOTS_NOINDEX_NOFOLLOW };

export default function AccountLayout({ children }) {
  return children;
}
