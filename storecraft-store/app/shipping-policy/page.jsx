import { LegalPolicyPage } from "@/components/store/LegalPolicyPage";
import { buildPageMetadata } from "@/lib/pageMetadata";
import {
  SHIPPING_POLICY_INTRO,
  getShippingPolicySections,
} from "@/lib/storePolicyCopy";

export const metadata = buildPageMetadata({
  title: "Shipping Policy",
  description:
    "Delivery charges, timelines, and courier options for Homefy.pk orders across Pakistan.",
  path: "/shipping-policy",
});

export default function ShippingPolicyPage() {
  return (
    <LegalPolicyPage
      title="Shipping Policy"
      path="/shipping-policy"
      intro={SHIPPING_POLICY_INTRO}
      sections={getShippingPolicySections()}
    />
  );
}
