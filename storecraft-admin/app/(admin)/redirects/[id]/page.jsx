import { RedirectForm } from "@/components/redirects/RedirectForm";

export const metadata = { title: "Edit redirect" };

export default async function Page({ params }) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-6xl">
      <RedirectForm redirectId={id} />
    </div>
  );
}
