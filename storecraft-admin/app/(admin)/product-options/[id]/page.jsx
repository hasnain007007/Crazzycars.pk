import { ProductOptionForm } from "@/components/product-options/ProductOptionForm";

export const metadata = { title: "Edit product option" };

export default async function Page({ params }) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-6xl">
      <ProductOptionForm optionId={id} />
    </div>
  );
}
