import { notFound } from "next/navigation";
import { ShopifyProductView } from "@/components/store/ShopifyProductView";
import { getProductByHandle, isShopifyEnabled } from "@/lib/shopify";
import { getSiteUrl } from "@/lib/siteUrl";

export const revalidate = 300;

export async function generateMetadata({ params }) {
  if (!isShopifyEnabled()) return { title: "Product Not Found", robots: { index: false, follow: false } };
  const { handle } = await params;
  const product = await getProductByHandle(handle).catch(() => null);
  if (!product) return { title: "Product Not Found", robots: { index: false, follow: false } };
  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: `${getSiteUrl()}/products/${product.handle}` },
    openGraph: { title: product.name, description: product.description, images: product.image ? [{ url: product.image }] : [] },
  };
}

export default async function ShopifyProductPage({ params }) {
  if (!isShopifyEnabled()) notFound();
  const { handle } = await params;
  const product = await getProductByHandle(handle).catch(() => null);
  if (!product) notFound();
  return <ShopifyProductView product={product} />;
}
