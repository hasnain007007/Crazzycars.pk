import { LegalPolicyPage } from "@/components/store/LegalPolicyPage";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { getAccountDeletionPage } from "@/lib/accountDeletionPage";

const page = getAccountDeletionPage();

export const metadata = buildPageMetadata({
  title: page.title,
  description: page.description,
  path: page.path,
});

export default function AccountDeletionPage() {
  return (
    <LegalPolicyPage
      title={page.title}
      path={page.path}
      intro={page.intro}
      sections={page.sections}
      relatedLinks={[
        { title: "Privacy Policy", href: "/privacy-policy" },
        { title: "Contact", href: "/contact" },
      ]}
    />
  );
}
