import { CheckoutView } from "@/components/store/CheckoutView";

export const metadata = { title: "Checkout" };

export default function Page() {
  return (
    <div style={{ background: "#FFFFFF", minHeight: "100vh" }}>
      <CheckoutView />
    </div>
  );
}
