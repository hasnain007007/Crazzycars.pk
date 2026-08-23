import { LegalPolicyPage } from "@/components/store/LegalPolicyPage";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { getReturnsPage } from "@/lib/storePolicyCopy";

export const metadata = buildPageMetadata({
  title: "Returns Policy",
  description: getReturnsPage().description,
  path: "/returns-policy",
});

export default function ReturnsPolicyPage() {
  const page = getReturnsPage();
  return (
    <LegalPolicyPage
      title={page.title}
      path="/returns-policy"
      intro={page.intro}
      sections={page.sections}
    />
  );
}
