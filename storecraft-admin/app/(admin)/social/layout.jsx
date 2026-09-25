import { SocialShell } from "@/components/social/SocialShell";

export const metadata = {
  title: "Social Posts",
};

export default function SocialLayout({ children }) {
  return <SocialShell>{children}</SocialShell>;
}
