/**
 * Neighbor loaders for storefront detail pages (list-order aware).
 */
import Product from "@/lib/models/Product.model";
import BlogPost from "@/lib/models/BlogPost.model";
import Category from "@/lib/models/Category.model";
import Page from "@/lib/models/Page.model";
import Vehicle from "@/lib/models/Vehicle.model";
import { WEBSITE_PRODUCT_FILTER } from "@/lib/productVisibility";
import { productPath } from "@/lib/productPath";
import { categoryHref } from "@/lib/categories";
import { CITY_LANDING_SLUGS, cityPath, mergeCityLanding } from "@/lib/cityLandingPages";
import { findNeighborsByOrder, neighborsFromList } from "@/lib/findNeighbors";

export async function loadProductNeighbors(product) {
  if (!product?._id) return { prev: null, next: null };
  return findNeighborsByOrder(Product, product, {
    where: { ...WEBSITE_PRODUCT_FILTER },
    orderBy: { createdAt: -1 },
    labelField: "name",
    hrefForDoc: (doc) => productPath(doc.slug),
    extraSelect: "slug",
  });
}

export async function loadBlogNeighbors(post) {
  if (!post?._id) return { prev: null, next: null };
  return findNeighborsByOrder(BlogPost, post, {
    where: { status: "published" },
    orderBy: { publishedAt: -1, createdAt: -1 },
    labelField: "title",
    hrefForDoc: (doc) => `/blogs/${doc.slug}`,
    extraSelect: "slug",
  });
}

export async function loadCategoryNeighbors(category) {
  if (!category?._id) return { prev: null, next: null };
  return findNeighborsByOrder(Category, category, {
    where: { status: "active" },
    orderBy: { level: 1, sortOrder: 1, name: 1 },
    labelField: "name",
    hrefForDoc: (doc) => categoryHref(doc.slug),
    extraSelect: "slug",
  });
}

export async function loadVehicleNeighbors(vehicle) {
  if (!vehicle?._id) return { prev: null, next: null };
  return findNeighborsByOrder(Vehicle, vehicle, {
    where: { isActive: true },
    orderBy: { make: 1, model: 1, yearFrom: 1 },
    labelField: "displayName",
    hrefForDoc: (doc) => `/cars/${doc.slug}`,
    extraSelect: "slug displayName",
  });
}

export async function loadCmsPageNeighbors(page, { hrefPrefix = "" } = {}) {
  if (!page?._id) return { prev: null, next: null };
  const prefix = String(hrefPrefix || "").replace(/\/$/, "");
  return findNeighborsByOrder(Page, page, {
    where: { status: "published" },
    orderBy: { updatedAt: -1 },
    labelField: "title",
    hrefForDoc: (doc) => (prefix ? `${prefix}/${doc.slug}` : `/${doc.slug}`),
    extraSelect: "slug",
  });
}

export function loadCityNeighbors(citySlug) {
  const items = CITY_LANDING_SLUGS.map((slug) => {
    const city = mergeCityLanding(slug);
    return {
      slug,
      name: city?.name || slug,
      href: cityPath(slug),
    };
  });
  return neighborsFromList(items, (item) => item.slug === String(citySlug || "").toLowerCase());
}
