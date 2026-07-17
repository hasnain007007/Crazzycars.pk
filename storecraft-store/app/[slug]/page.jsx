import { notFound } from "next/navigation";
import { ProductDetailMedico } from "@/components/store/ProductDetailMedico";
import PageView from "@/components/store/PageView";
import { CategoryDetailPageClient } from "@/components/store/CategoryDetailPageClient";
import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";
import Page from "@/lib/models/Page.model";
import Category from "@/lib/models/Category.model";
import { loadStoreCategoryDetail } from "@/lib/storeCategoryData";
import { serializeStoreProductDetail } from "@/lib/storeSerialize";

export const dynamic = "force-dynamic";

const BASE_URL = (process.env.NEXT_PUBLIC_STORE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://crazzycars.pk").replace(/\/$/, "");
const BRAND = process.env.NEXT_PUBLIC_STORE_NAME || process.env.NEXT_PUBLIC_APP_NAME || `${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}`;
const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || "PKR";

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
      "name slug articleNo media pricing inventory status simpleVariations variationCombinations featured newArrival categories variationTypes variationOptions variants shortDescription longDescription features addOns customSizing specifications seo"
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
    const title = (p.seo?.metaTitle || "").trim() || p.name;
    const description =
      (p.seo?.metaDescription || "").trim() ||
      stripHtml(p.shortDescription || "").slice(0, 160) ||
      stripHtml(p.longDescription || "").slice(0, 160) ||
      `Buy ${p.name} at ${BRAND}. Premium car accessories.`;
    const mainImg = p.media?.images?.find((i) => i?.isMain)?.url || p.media?.images?.[0]?.url;

    return {
      title,
      description,
      keywords: [p.name, "car accessories", "floor mats", BRAND],
      alternates: { canonical },
      openGraph: {
        title: p.name,
        description: (p.seo?.metaDescription || "").trim() || stripHtml(p.shortDescription || "").slice(0, 200) || `Buy ${p.name} at ${BRAND}`,
        type: "website",
        url: canonical,
        images: mainImg ? [{ url: mainImg, width: 800, height: 800, alt: p.name }] : [],
      },
      twitter: {
        card: "summary_large_image",
        title: p.name,
        description: (p.seo?.metaDescription || "").trim() || stripHtml(p.shortDescription || "").slice(0, 200) || `Buy ${p.name} at ${BRAND}`,
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
        title: cat.name,
        description: `Shop ${cat.name} at ${BRAND}`,
        url: canonical,
        images: cat.image?.url ? [{ url: cat.image.url }] : [],
      },
    };
  }

  const page = content.data;
  return {
    title: page.seo?.metaTitle || `${page.title} | ${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}`,
    description: page.seo?.metaDescription || "",
    keywords: page.seo?.keywords || "",
    alternates: {
      canonical: page.seo?.canonical || `${BASE_URL}/${slugStr}`,
    },
    openGraph: {
      title: page.seo?.metaTitle || page.title,
      description: page.seo?.metaDescription || "",
      type: "website",
      url: `${BASE_URL}/${slugStr}`,
    },
  };
}

function productJsonLd(product) {
  const desc = stripHtml(product.shortDescription || product.longDescription || "").slice(0, 5000);
  const images = (product.media?.images || product.images || []).map((i) => (typeof i === "string" ? i : i?.url)).filter(Boolean);

  const displayPrice = Number(
    product.isOnSale && product.salePrice ? product.salePrice : product.price || product.regularPrice || 0
  ).toFixed(2);

  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: desc || `${product.name} — premium car accessories from ${BRAND}.`,
    image: images,
    sku: product.articleNo || product.id || "",
    mpn: product.articleNo || "",
    brand: { "@type": "Brand", name: BRAND },
    category: product.categories?.[0]?.name || "",
    offers: {
      "@type": "Offer",
      url: `${BASE_URL}/${product.slug}`,
      priceCurrency: CURRENCY,
      price: displayPrice,
      priceValidUntil: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      itemCondition: "https://schema.org/NewCondition",
      availability: product.inStock !== false ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: BRAND },
    },
  };

  if (product.specifications?.length > 0) {
    schema.additionalProperty = product.specifications.map((s) => ({
      "@type": "PropertyValue",
      name: s.label,
      value: s.value,
    }));
  }

  return schema;
}

function breadcrumbJsonLd(product) {
  const cat = product.categories?.[0];
  const items = [
    { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
  ];

  if (cat) {
    items.push({ "@type": "ListItem", position: 2, name: cat.name, item: `${BASE_URL}/${cat.slug}` });
    items.push({ "@type": "ListItem", position: 3, name: product.name, item: `${BASE_URL}/${product.slug}` });
  } else {
    items.push({ "@type": "ListItem", position: 2, name: "Products", item: `${BASE_URL}/products` });
    items.push({ "@type": "ListItem", position: 3, name: product.name, item: `${BASE_URL}/${product.slug}` });
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(content.data)) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(content.data)) }} />
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
