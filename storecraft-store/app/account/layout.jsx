import { ROBOTS_NOINDEX_FOLLOW } from "@/lib/seo/robotsMeta";

/** Private customer area — never index; allow link equity to pass. */
export const metadata = {
  title: "My Account | CrazzyCars.pk",
  description: "Sign in to manage your CrazzyCars.pk orders, addresses and profile.",
  robots: ROBOTS_NOINDEX_FOLLOW,
};

export default function AccountLayout({ children }) {
  return children;
}
