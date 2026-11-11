import { ROBOTS_NOINDEX_NOFOLLOW } from "@/lib/seo/robotsMeta";

/** /cart 308s to /shop; keep explicit noindex if HTML is ever served. */
export const metadata = {
  robots: ROBOTS_NOINDEX_NOFOLLOW,
  title: "Your cart",
};

export default function CartLayout({ children }) {
  return children;
}
