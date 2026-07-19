import { notFound } from "next/navigation";
import { ProductDetailMedico } from "@/components/store/ProductDetailMedico";
import PageView from "@/components/store/PageView";
import { CategoryDetailPageClient } from "@/components/store/CategoryDetailPageClient";
import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";
import Page from "@/lib/models/Page.model";
import { loadStoreCategoryDetail } from "@/lib/storeCategoryData";
import { serializeStoreProductDetail } from "@/lib/storeSerialize";
import { getSiteUrl } from "@/lib/siteUrl";
import {
  productJsonLd as buildProductJsonLd,
  breadcrumbJsonLd as buildBreadcrumbJsonLd,
} from "@/lib/seo/jsonld";

export const dynamic = "force-dynamic";

const BASE_URL = getSiteUrl();
const BRAND = process.env.NEXT_PUBLIC_STORE_NAME || process.env.NEXT_PUBLIC_APP_NAME || "Crazzycars.pk";

function stripHtml(s) {
  return String(s || "").replace(/<[^>]*>/g, "");
}

async function loadContent(slug) {
  await dbConnect();
  const slugStr = String(slug || "").trim();

  const product = await Product.findOne({
    slug: slugStr,
    status: { $regex: /^active$/i },
  })
    .select(
      "name slug articleNo media pricing inventory status simpleVariations variationCombinations featured newArrival categories variationTypes variationOptions variants shortDescription longDescription features addOns customSizing specifications seo metaTitle metaDescription averageRating ratingAverage rating reviewCount totalReviews numReviews isUniversal compatibleVehicles"
    )
    .populate("categories", "name slug")
    .lean();

  if (product) {
    return {
      type: "product",
      data: serializeStoreProductDetail(product),
    };
  }

  const page = await Page.findOne({
    slug: slugStr,
    status: "published",
  }).lean();

  if (page) {
    return {
      type: "page",
      data: JSON.parse(JSON.stringify(page)),
    };
  }

  const catDetail = await loadStoreCategoryDetail(slugStr);
  if (catDetail) {
    return {
      type: "category",
      data: JSON.parse(
        JSON.stringify({
          category: catDetail.category,
          subcategories: catDetail.subcategories,
          products: catDetail.products,
          breadcrumbs: catDetail.breadcrumbs,
        })
      ),
    };
  }

  return null;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const slugStr = String(slug || "").trim();
  const content = await loadContent(slugStr);
  if (!content) return { title: "Not Found" };
  const canonical = `${BASE_URL}/${slugStr}`;

  if (content.type === "product") {
    const p = content.data;
    const title = (p.metaTitle || p.seo?.metaTitle || "").trim() || p.name;
    const description =
      (p.metaDescription || p.seo?.metaDescription || "").trim() ||
      stripHtml(p.shortDescription || "").slice(0, 160) ||
      stripHtml(p.longDescription || "").slice(0, 160) ||
      `Buy ${p.name} at ${BRAND}. Premium car accessories.`;
    const mainImg = p.media?.images?.find((i) => i?.isMain)?.url || p.media?.images?.[0]?.url;

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title,
        description:
          (p.metaDescription || p.seo?.metaDescription || "").trim() ||
          stripHtml(p.shortDescription || "").slice(0, 200) ||
          `Buy ${p.name} at ${BRAND}`,
        type: "website",
        url: canonical,
        images: mainImg ? [{ url: mainImg, width: 800, height: 800, alt: p.name }] : [],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: mainImg ? [mainImg] : [],
      },
    };
  }

  if (content.type === "category") {
    const cat = content.data.category;
    const title = (cat.seo?.metaTitle || "").trim() || cat.name;
    const description =
      (cat.seo?.metaDescription || "").trim() ||
      `Shop ${cat.name} at ${BRAND}. Premium car accessories collection.`;
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title,
        description: `Shop ${cat.name} at ${BRAND}`,
        url: canonical,
        images: cat.image?.url ? [{ url: cat.image.url }] : [],
      },
      twitter: { card: "summary_large_image", title, description },
    };
  }

  const page = content.data;
  return {
    title: page.seo?.metaTitle || `${page.title} | ${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}`,
    description: page.seo?.metaDescription || "",
    alternates: {
      canonical: page.seo?.canonical || `${BASE_URL}/${slugStr}`,
    },
    openGraph: {
      title: page.seo?.metaTitle || `${page.title} | ${process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk"}`,
      description: page.seo?.metaDescription || "",
      type: "website",
      url: `${BASE_URL}/${slugStr}`,
    },
    twitter: {
      card: "summary_large_image",
      title: page.seo?.metaTitle || `${page.title} | ${process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk"}`,
      description: page.seo?.metaDescription || "",
    },
  };
}

function toProductLd(product) {
  const images = (product.media?.images || product.images || [])
    .map((i) => (typeof i === "string" ? i : i?.url))
    .filter(Boolean);
  const price = Number(
    product.isOnSale && product.salePrice
      ? product.salePrice
      : product.price || product.regularPrice || product.pricing?.salePrice || product.pricing?.regularPrice || 0
  );
  const stock = Number(product.inventory?.quantity ?? (product.inStock === false ? 0 : 1));
  return buildProductJsonLd({
    name: product.name,
    slug: product.slug,
    urlPath: `/${product.slug}`,
    images,
    metaDescription: product.metaDescription || product.seo?.metaDescription,
    shortDescription: stripHtml(product.shortDescription || product.longDescription || ""),
    sku: product.articleNo || product.inventory?.sku,
    brand: BRAND,
    salePrice: price,
    price,
    stock,
    ratingValue: product.averageRating || product.rating,
    reviewCount: product.reviewCount || product.numReviews,
  });
}

function toBreadcrumbLd(product) {
  const cat = product.categories?.[0];
  const items = [{ name: "Home", url: "/" }];
  if (cat?.slug) {
    items.push({ name: cat.name, url: `/categories/${cat.slug}` });
  } else {
    items.push({ name: "Products", url: "/shop" });
  }
  items.push({ name: product.name, url: `/${product.slug}` });
  return buildBreadcrumbJsonLd(items);
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const slugStr = String(slug || "").trim();
  if (!slugStr) notFound();
  const content = await loadContent(slugStr);
  if (!content) notFound();

  if (content.type === "product") {
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(toProductLd(content.data)) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(toBreadcrumbLd(content.data)) }}
        />
        <ProductDetailMedico product={content.data} />
      </>
    );
  }

  if (content.type === "page") {
    return <PageView page={content.data} slug={slugStr} />;
  }

  if (content.type === "category") {
    const d = content.data;
    return (
      <div style={{ background: "#FFFFFF", minHeight: "100vh" }}>
        <CategoryDetailPageClient
          initialCategory={d.category}
          initialSubcategories={d.subcategories}
          initialProducts={d.products}
          initialBreadcrumbs={d.breadcrumbs}
        />
      </div>
    );
  }

  notFound();
}
