import { OrderConfirmationView } from "@/components/store/OrderConfirmationView";

export const metadata = { title: "Order confirmation" };

export default function Page() {
  return (
    <div style={{ background: "#FFFFFF", minHeight: "100vh" }}>
      <OrderConfirmationView  />
    </div>
  );
}
