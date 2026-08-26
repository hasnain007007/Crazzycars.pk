import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { ProductDetailMedico } from "@/components/store/ProductDetailMedico";
import PageView from "@/components/store/PageView";
import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";
import Page from "@/lib/models/Page.model";
import { loadStoreCategoryDetail } from "@/lib/storeCategoryData";
import { serializeStoreProductDetail, serializeStoreProductSummary } from "@/lib/storeSerialize";
import { getSiteUrl } from "@/lib/siteUrl";
import { findActiveProductBySlugParam } from "@/lib/resolveProductSlug";
import {
  productJsonLd as buildProductJsonLd,
  breadcrumbJsonLd as buildBreadcrumbJsonLd,
} from "@/lib/seo/jsonld";
import { buildBrandedAbsoluteTitle } from "@/lib/seo/brandedTitle";

/**
 * ISR for product / CMS pages. Category slugs 308 to /categories/:slug.
 * 120s: prices & stock can lag up to ~2 minutes after admin edits
 * (acceptable vs force-dynamic on every visit). Revalidate webhook can
 * shorten this later without changing the page.
 */
export const revalidate = 120;

const BASE_URL = getSiteUrl();
const BRAND = process.env.NEXT_PUBLIC_STORE_NAME || process.env.NEXT_PUBLIC_APP_NAME || "Homefy.pk";
const PRODUCT_TITLE_BRAND = "Homefy";
const PRODUCT_TITLE_SUFFIX = ` | ${PRODUCT_TITLE_BRAND}`;
const PRODUCT_TITLE_MAX_LENGTH = 60;

function stripHtml(s) {
  return String(s || "").replace(/<[^>]*>/g, "");
}

function stripTrailingProductTitleBrand(value) {
  let title = String(value || "").trim();
  const trailingBrand =
    /\s*[|\u2013\u2014-]\s*(?:Homefy(?:\.pk)?|Homefy\.pk)\s*$/i;

  for (let i = 0; i < 3; i += 1) {
    const stripped = title
      .replace(trailingBrand, "")
      .replace(/[\s|\u2013\u2014-]+$/g, "")
      .trim();
    if (stripped === title) break;
    title = stripped;
  }

  return title;
}

function truncateProductTitleAtWord(value, maxLength) {
  const title = String(value || "").trim();
  if (title.length <= maxLength) return title;

  const withinLimit = title.slice(0, maxLength);
  const lastSpace = withinLimit.lastIndexOf(" ");
  const truncated = (lastSpace > 0 ? withinLimit.slice(0, lastSpace) : withinLimit)
    .replace(/[\s|\u2013\u2014,;:-]+$/g, "")
    .trim();

  return truncated || withinLimit.trim();
}

function buildProductSeoTitle({ name, metaTitle }) {
  const source = String(metaTitle || "").trim() || String(name || "").trim();
  const unbrandedTitle = stripTrailingProductTitleBrand(source);
  const titleBudget = PRODUCT_TITLE_MAX_LENGTH - PRODUCT_TITLE_SUFFIX.length;
  const truncatedTitle = truncateProductTitleAtWord(unbrandedTitle, titleBudget);

  return `${truncatedTitle}${PRODUCT_TITLE_SUFFIX}`;
}

function querySuffix(searchParams) {
  if (!searchParams) return "";
  const params = new URLSearchParams();
  const entries =
    typeof searchParams.entries === "function"
      ? [...searchParams.entries()]
      : Object.entries(searchParams);
  for (const [key, value] of entries) {
    if (value == null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item != null && item !== "") params.append(key, String(item));
      }
    } else {
      params.append(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function redirectWithQuery(to, searchParams) {
  const suffix = querySuffix(searchParams);
  permanentRedirect(suffix && !String(to).includes("?") ? `${to}${suffix}` : to);
}

async function loadRelatedProducts(product) {
  try {
    const categoryIds = (product?.categories || [])
      .map((c) => {
        if (c == null) return null;
        if (typeof c === "object" && c._id) return c._id;
        return c;
      })
      .filter(Boolean);

    const filter = {
      status: "active",
      _id: { $ne: product._id },
    };
    if (categoryIds.length) {
      filter.categories = { $in: categoryIds };
    }

    const rows = await Product.find(filter)
      .select(
        "name slug media pricing inventory featured newArrival categories rating averageRating ratingAverage reviewCount totalReviews numReviews shortDescription articleNo createdAt tags"
      )
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    // Ensure RSC → client props are plain JSON (no Date / ObjectId surprises).
    return JSON.parse(JSON.stringify(rows.map(serializeStoreProductSummary)));
  } catch (err) {
    console.error("[loadRelatedProducts]", err?.message || err);
    return [];
  }
}

/**
 * One Mongo load per request — shared by generateMetadata + page via React.cache.
 */
const loadContent = cache(async (slug) => {
  await dbConnect();
  const slugStr = String(slug || "").trim();

  // Exact slug first (fast path).
  let product = await Product.findOne({
    slug: slugStr,
    status: "active",
  })
    .select(
      "name slug articleNo media pricing inventory status simpleVariations variationCombinations featured newArrival categories variationTypes variationOptions variants shortDescription longDescription features addOns customSizing specifications seo metaTitle metaDescription averageRating ratingAverage rating reviewCount totalReviews numReviews isUniversal compatibleVehicles compatibleCars vehicleCompatibility"
    )
    .populate("categories", "name slug")
    .lean();

  // Meta / Shopify-era handles often omit the `-homefy-pk` suffix.
  if (!product) {
    const legacy = await findActiveProductBySlugParam(slugStr);
    if (legacy?.slug && legacy.slug !== slugStr) {
      return { type: "redirect", to: `/${legacy.slug}` };
    }
    if (legacy?.slug) {
      product = await Product.findOne({
        slug: legacy.slug,
        status: "active",
      })
        .select(
          "name slug articleNo media pricing inventory status simpleVariations variationCombinations featured newArrival categories variationTypes variationOptions variants shortDescription longDescription features addOns customSizing specifications seo metaTitle metaDescription averageRating ratingAverage rating reviewCount totalReviews numReviews isUniversal compatibleVehicles compatibleCars vehicleCompatibility"
        )
        .populate("categories", "name slug")
        .lean();
    }
  }

  if (product) {
    if (product.slug && product.slug !== slugStr) {
      return { type: "redirect", to: `/${product.slug}` };
    }
    const relatedProducts = await loadRelatedProducts(product);
    return {
      type: "product",
      data: serializeStoreProductDetail(product),
      relatedProducts,
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
    const catSlug = catDetail.category?.slug || slugStr;
    return { type: "redirect", to: `/categories/${catSlug}` };
  }

  return null;
});

export async function generateMetadata({ params, searchParams }) {
  const { slug } = await params;
  const slugStr = String(slug || "").trim();
  const content = await loadContent(slugStr);
  if (!content) {
    return {
      title: "Page not found",
      robots: { index: false, follow: true },
    };
  }
  if (content.type === "redirect") {
    redirectWithQuery(content.to, await searchParams);
  }
  const canonical = `${BASE_URL}/${content.type === "product" ? content.data.slug : slugStr}`;

  if (content.type === "product") {
    const p = content.data;
    const title = buildProductSeoTitle({
      name: p.name,
      metaTitle: p.metaTitle || p.seo?.metaTitle,
    });
    const description =
      (p.metaDescription || p.seo?.metaDescription || "").trim() ||
      stripHtml(p.shortDescription || "").slice(0, 160) ||
      stripHtml(p.longDescription || "").slice(0, 160) ||
      `Buy ${p.name} at ${BRAND}. Cash on Delivery nationwide.`;
    const keywords = Array.isArray(p.seo?.metaKeywords)
      ? p.seo.metaKeywords.map((k) => String(k || "").trim()).filter(Boolean)
      : [];
    const mainImg = p.media?.images?.find((i) => i?.isMain)?.url || p.media?.images?.[0]?.url;

    return {
      title: { absolute: title },
      description,
      ...(keywords.length ? { keywords } : {}),
      alternates: { canonical },
      openGraph: {
        title: title,
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

  const page = content.data;
  const pageTitleMeta = buildBrandedAbsoluteTitle(
    (page.seo?.metaTitle || "").trim() || page.title,
    { brand: BRAND }
  );
  const pageTitle = pageTitleMeta.absolute;
  return {
    title: pageTitleMeta,
    description: page.seo?.metaDescription || "",
    alternates: {
      canonical: page.seo?.canonical || `${BASE_URL}/${slugStr}`,
    },
    openGraph: {
      title: pageTitle,
      description: page.seo?.metaDescription || "",
      type: "website",
      url: `${BASE_URL}/${slugStr}`,
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
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
  const stock = Number(product.inventory?.quantity ?? product.stock ?? (product.inStock === false ? 0 : 1));
  return buildProductJsonLd({
    name: product.name,
    slug: product.slug,
    urlPath: `/${product.slug}`,
    images,
    metaDescription: product.metaDescription || product.seo?.metaDescription,
    shortDescription: stripHtml(product.shortDescription || product.longDescription || ""),
    sku: product.articleNo || product.inventory?.sku,
    articleNo: product.articleNo,
    ean: product.ean,
    partNumber: product.partNumber,
    mpn: product.partNumber || product.articleNo,
    brand: BRAND,
    vendor: product.vendor,
    condition: product.condition || "new",
    categories: product.categories,
    salePrice: price,
    price,
    stock,
    trackInventory: product.trackInventory ?? product.inventory?.trackInventory,
    allowBackorder: product.allowBackorder ?? product.inventory?.allowBackorder,
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

export default async function ProductPage({ params, searchParams }) {
  const { slug } = await params;
  const slugStr = String(slug || "").trim();
  if (!slugStr) notFound();
  const content = await loadContent(slugStr);
  if (!content) notFound();
  if (content.type === "redirect") {
    redirectWithQuery(content.to, await searchParams);
  }

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
        <ProductDetailMedico product={content.data} relatedProducts={content.relatedProducts || []} />
      </>
    );
  }

  if (content.type === "page") {
    return <PageView page={content.data} slug={slugStr} />;
  }

  notFound();
}
