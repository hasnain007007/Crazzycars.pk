import { LegalPolicyPage } from "@/components/store/LegalPolicyPage";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { getReturnsPage } from "@/lib/storePolicyCopy";

export const metadata = buildPageMetadata({
  title: "Returns & Refunds Policy | CrazzyCars.pk",
  description: getReturnsPage().description,
  path: "/returns-policy",
  absoluteTitle: true,
});

export default function ReturnsPolicyPage() {
  const page = getReturnsPage();
  return (
    <LegalPolicyPage
      title="Returns & Refunds Policy"
      path="/returns-policy"
      intro={page.intro}
      sections={page.sections}
      relatedLinks={[
        // TODO(M4c): restore /blogs/car-accessories-returns-wrong-item-pakistan-crazzycars
        {
          title: "FAQ — returns & wrong-item",
          href: "/faq",
        },
      ]}
    />
  );
}
