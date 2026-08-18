import { ROBOTS_NOINDEX_FOLLOW } from "@/lib/seo/robotsMeta";

export const metadata = {
  title: "Search",
  robots: ROBOTS_NOINDEX_FOLLOW,
};

export default function SearchLayout({ children }) {
  return children;
}
