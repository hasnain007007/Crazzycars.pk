import { RedirectListPage } from "@/components/redirects/RedirectListPage";

export const metadata = { title: "Redirects" };

export default function Page() {
  return (
    <div className="mx-auto max-w-6xl">
      <RedirectListPage />
    </div>
  );
}
