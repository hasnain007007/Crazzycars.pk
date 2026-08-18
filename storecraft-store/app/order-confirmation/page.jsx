import { OrderConfirmationView } from "@/components/store/OrderConfirmationView";
import { ROBOTS_NOINDEX_NOFOLLOW } from "@/lib/seo/robotsMeta";

export const metadata = {
  title: "Order confirmation",
  robots: ROBOTS_NOINDEX_NOFOLLOW,
};

export default function Page() {
  return (
    <div style={{ background: "#FFFFFF", minHeight: "100vh" }}>
      <OrderConfirmationView />
    </div>
  );
}
