import { CheckoutView } from "@/components/store/CheckoutView";
import { ROBOTS_NOINDEX_NOFOLLOW } from "@/lib/seo/robotsMeta";

export const metadata = {
  title: "Checkout",
  robots: ROBOTS_NOINDEX_NOFOLLOW,
};

export default function Page() {
  return (
    <div style={{ background: "#FFFFFF", minHeight: "100vh" }}>
      <CheckoutView />
    </div>
  );
}
