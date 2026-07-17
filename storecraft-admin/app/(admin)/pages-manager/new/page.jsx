import { PageForm } from "@/components/pages-manager/PageForm";

export const metadata = { title: "New page" };

export default function Page() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageForm />
    </div>
  );
}
