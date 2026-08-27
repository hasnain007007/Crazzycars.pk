import { CartPageView } from "@/components/store/CartPageView";
import { ROBOTS_NOINDEX_NOFOLLOW } from "@/lib/seo/robotsMeta";

export const metadata = {
  title: "Your cart | Homefy.pk",
  robots: ROBOTS_NOINDEX_NOFOLLOW,
};

export default function CartPage() {
  return <CartPageView />;
}
