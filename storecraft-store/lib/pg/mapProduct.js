function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

export function mapCategoryRow(row) {
  if (!row) return null;
  const parentId = row.parent_id || null;
  return {
    _id: row.id,
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || "",
    shortDescription: row.description || "",
    image: {
      url: row.image_url || "",
      altText: row.image_alt || row.name || "",
    },
    homepageIcon: row.homepage_icon || "",
    icon: row.homepage_icon || "",
    level: num(row.level),
    sortOrder: num(row.sort_order),
    status: row.status || "active",
    featured: Boolean(row.featured),
    isFeatured: Boolean(row.featured),
    showInNav: row.show_in_nav !== false,
    showOnHomepage: Boolean(row.show_on_homepage),
    seo: row.seo && typeof row.seo === "object" ? row.seo : {},
    parentId,
    parentCategory: parentId
      ? {
          _id: parentId,
          name: row.parent_name || "",
          slug: row.parent_slug || "",
        }
      : null,
    parents: parentId ? [parentId] : [],
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

export function mapPageRow(row) {
  if (!row) return null;
  return {
    _id: row.id,
    title: row.title,
    slug: row.slug,
    content: row.content || "",
    template: row.template || "custom",
    status: row.status || "draft",
    showInFooter: Boolean(row.show_in_footer),
    seo: row.seo && typeof row.seo === "object" ? row.seo : {},
    sortOrder: num(row.sort_order),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

export function mapProductRow(row, extras = {}) {
  if (!row) return null;
  const images = (extras.images || []).map((img, i) => ({
    url: img.url,
    altText: img.alt_text || row.name || "",
    isMain: Boolean(img.is_main) || i === 0,
  }));
  const categories = (extras.categories || []).map((c) => ({
    _id: c.id,
    id: c.id,
    name: c.name,
    slug: c.slug,
  }));
  const simpleVariations = (extras.axes || []).map((axis) => ({
    name: axis.name,
    enabled: axis.enabled !== false,
    tags: asArray(axis.values),
  }));
  const variationCombinations = (extras.variants || []).map((combo) => ({
    _id: combo.id,
    sku: combo.sku || "",
    options: asArray(combo.options),
    price: num(combo.price),
    stock: num(combo.stock),
    image: combo.image_url || "",
  }));

  return {
    _id: row.id,
    id: row.id,
    name: row.name,
    slug: row.slug,
    articleNo: row.article_no || "",
    shortDescription: row.short_description || "",
    longDescription: row.long_description || "",
    vendor: row.vendor || "Homefy",
    productType: row.product_type || "",
    collections: asArray(row.collections),
    tags: asArray(row.tags),
    features: asArray(row.features),
    specifications: asArray(row.specifications),
    status: row.status || "active",
    featured: Boolean(row.featured),
    isFeatured: Boolean(row.featured),
    newArrival: Boolean(row.new_arrival),
    isDeal: Boolean(row.is_deal),
    codEnabled: row.cod_enabled !== false,
    seo: row.seo && typeof row.seo === "object" ? row.seo : {},
    rating: num(row.rating_average),
    averageRating: num(row.rating_average),
    ratingAverage: num(row.rating_average),
    reviewCount: num(row.review_count),
    totalReviews: num(row.review_count),
    numReviews: num(row.review_count),
    pricing: {
      regularPrice: num(row.regular_price),
      // null / 0 = no sale. Do not coerce to 0 — callers that use `salePrice ?? price`
      // would otherwise charge Rs.0 on the 55 products with no sale_price.
      salePrice:
        row.sale_price != null && Number(row.sale_price) > 0 ? num(row.sale_price) : null,
    },
    inventory: {
      sku: row.sku || row.article_no || "",
      quantity: num(row.quantity),
      stock: num(row.quantity),
      trackInventory: row.track_inventory !== false,
      allowBackorder: row.allow_backorder === true,
      weight: num(row.weight),
      weightUnit: row.weight_unit || "g",
    },
    media: { images },
    categories,
    simpleVariations,
    variationCombinations,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}
