import { PageListPage } from "@/components/pages-manager/PageListPage";

export const metadata = { title: "Pages" };

export default function Page() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageListPage />
    </div>
  );
}
