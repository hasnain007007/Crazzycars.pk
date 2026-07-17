import { PageForm } from "@/components/pages-manager/PageForm";

export const metadata = { title: "Edit page" };

export default async function Page({ params }) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-6xl">
      <PageForm pageId={id} />
    </div>
  );
}
