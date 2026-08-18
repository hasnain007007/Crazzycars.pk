import { buildPageMetadata } from "@/lib/pageMetadata";

export const metadata = {
  ...buildPageMetadata({
    title: "Checkout",
    description: "Complete your CrazzyCars.pk order.",
    path: "/checkout",
    noIndex: true,
    noFollow: true,
  }),
};

export default function CheckoutLayout({ children }) {
  return children;
}
