import { LegalPolicyPage } from "@/components/store/LegalPolicyPage";
import { buildPageMetadata } from "@/lib/pageMetadata";
import {
  SHIPPING_POLICY_INTRO,
  getShippingPolicySections,
} from "@/lib/storePolicyCopy";

export const metadata = buildPageMetadata({
  title: "Shipping Policy | Delivery Charges Pakistan | CrazzyCars.pk",
  description:
    "CrazzyCars.pk shipping across Pakistan: delivery charges, bulky vs regular items, COD notes, and how long orders take from Gujranwala to your city.",
  path: "/shipping-policy",
  absoluteTitle: true,
});

export default function ShippingPolicyPage() {
  return (
    <LegalPolicyPage
      title="Shipping Policy"
      path="/shipping-policy"
      intro={SHIPPING_POLICY_INTRO}
      sections={getShippingPolicySections()}
      relatedLinks={[
        // TODO(M4c): restore /blogs/crazzycars-delivery-charges-regular-vs-bulky-pakistan
        {
          title: "FAQ — delivery charges",
          href: "/faq",
        },
      ]}
    />
  );
}
