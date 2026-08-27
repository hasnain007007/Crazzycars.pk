import { pgQuery } from "./pool";
import { mapCategoryRow, mapPageRow, mapProductRow } from "./mapProduct";
import { serializeStoreProductDetail, serializeStoreProductSummary } from "@/lib/storeSerialize";
import { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { listingMongoSortSpec } from "@/lib/productListing";

const EFFECTIVE_PRICE = `case
  when p.sale_price is not null and p.sale_price > 0 and p.sale_price < p.regular_price then p.sale_price
  else p.regular_price
end`;

function listingSortSql(sortSpec) {
  if (sortSpec?.["pricing.regularPrice"] === 1) return `${EFFECTIVE_PRICE} asc, p.created_at desc`;
  if (sortSpec?.["pricing.regularPrice"] === -1) return `${EFFECTIVE_PRICE} desc, p.created_at desc`;
  if (sortSpec?.reviewCount === -1 && sortSpec?.averageRating !== -1) {
    return `p.review_count desc, p.created_at desc`;
  }
  if (sortSpec?.averageRating === -1) {
    return `p.rating_average desc, p.review_count desc, p.created_at desc`;
  }
  return `p.created_at desc`;
}

async function hydrateProducts(rows) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [{ rows: images }, { rows: cats }, { rows: axes }, { rows: variants }] = await Promise.all([
    pgQuery(
      `select product_id, url, alt_text, is_main, sort_order
       from public.product_images
       where product_id = any($1::uuid[])
       order by sort_order asc`,
      [ids]
    ),
    pgQuery(
      `select pc.product_id, c.id, c.name, c.slug
       from public.product_categories pc
       join public.categories c on c.id = pc.category_id
       where pc.product_id = any($1::uuid[])
       order by c.level asc, c.sort_order asc`,
      [ids]
    ),
    pgQuery(
      `select product_id, id, name, enabled, values
       from public.product_option_axes
       where product_id = any($1::uuid[])`,
      [ids]
    ),
    pgQuery(
      `select product_id, id, sku, options, price, stock, image_url
       from public.product_variants
       where product_id = any($1::uuid[])`,
      [ids]
    ),
  ]);

  const imagesBy = groupBy(images, "product_id");
  const catsBy = groupBy(cats, "product_id");
  const axesBy = groupBy(axes, "product_id");
  const variantsBy = groupBy(variants, "product_id");

  return rows.map((row) =>
    mapProductRow(row, {
      images: imagesBy.get(row.id) || [],
      categories: catsBy.get(row.id) || [],
      axes: axesBy.get(row.id) || [],
      variants: variantsBy.get(row.id) || [],
    })
  );
}

function groupBy(rows, key) {
  const map = new Map();
  for (const row of rows) {
    const id = row[key];
    if (!map.has(id)) map.set(id, []);
    map.get(id).push(row);
  }
  return map;
}

async function categoryScopeIds(slug) {
  const { rows } = await pgQuery(
    `with recursive tree as (
       select id from public.categories where lower(slug) = lower($1) and status = 'active'
       union all
       select c.id
       from public.categories c
       join tree t on c.parent_id = t.id
       where c.status = 'active'
     )
     select id from tree`,
    [slug]
  );
  return rows.map((r) => r.id);
}

export async function pgCountActiveProducts() {
  const { rows } = await pgQuery(
    `select count(*)::int as n from public.products where status = 'active'`
  );
  return rows[0]?.n ?? 0;
}

export async function pgFindProductBySlug(slug) {
  const { rows } = await pgQuery(
    `select * from public.products where slug = $1 and status = 'active' limit 1`,
    [slug]
  );
  if (!rows[0]) return null;
  const [mapped] = await hydrateProducts(rows);
  return mapped;
}

export async function pgResolveProductSlug(rawSlug) {
  const slug = String(rawSlug || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
  if (!slug) return null;

  const exact = await pgQuery(
    `select id, slug from public.products where slug = $1 and status = 'active' limit 1`,
    [slug]
  );
  if (exact.rows[0]) return { _id: exact.rows[0].id, slug: exact.rows[0].slug };

  if (!/-homefy-pk$/i.test(slug)) {
    const branded = await pgQuery(
      `select id, slug from public.products where slug = $1 and status = 'active' limit 1`,
      [`${slug}-homefy-pk`]
    );
    if (branded.rows[0]) return { _id: branded.rows[0].id, slug: branded.rows[0].slug };
  }

  const ci = await pgQuery(
    `select id, slug from public.products where lower(slug) = lower($1) and status = 'active' limit 1`,
    [slug]
  );
  if (ci.rows[0]) return { _id: ci.rows[0].id, slug: ci.rows[0].slug };

  if (slug.length >= 8) {
    const prefix = await pgQuery(
      `select id, slug from public.products
       where status = 'active' and slug ilike $1
       order by char_length(slug) asc
       limit 8`,
      [`${slug}%`]
    );
    if (prefix.rows[0]) return { _id: prefix.rows[0].id, slug: prefix.rows[0].slug };
  }

  return null;
}

export async function pgFindRelatedProducts(product, limit = 6) {
  const categoryIds = (product?.categories || []).map((c) => c._id || c.id).filter(Boolean);
  const params = [product._id, limit];
  let sql = `select p.* from public.products p
    where p.status = 'active' and p.id <> $1`;
  if (categoryIds.length) {
    sql += ` and exists (
      select 1 from public.product_categories pc
      where pc.product_id = p.id and pc.category_id = any($3::uuid[])
    )`;
    params.push(categoryIds);
  }
  sql += ` order by p.created_at desc limit $2`;
  const { rows } = await pgQuery(sql, params);
  const mapped = await hydrateProducts(rows);
  return mapped.map(serializeStoreProductSummary);
}

export async function pgFetchProductListing({ listing, limit, page, q, sortSpec }) {
  const clauses = [`p.status = 'active'`];
  const params = [];
  const add = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (listing?.category) {
    const ids = await categoryScopeIds(listing.category);
    if (!ids.length) {
      return { products: [], total: 0, page, totalPages: 1, query: q || "" };
    }
    clauses.push(
      `exists (select 1 from public.product_categories pc where pc.product_id = p.id and pc.category_id = any(${add(ids)}::uuid[]))`
    );
  }

  if (listing?.sale || listing?.deals) {
    clauses.push(`p.sale_price is not null and p.sale_price > 0 and p.sale_price < p.regular_price`);
  }

  const minPrice = listing?.minPrice !== "" && listing?.minPrice != null ? Number(listing.minPrice) : null;
  if (minPrice != null && Number.isFinite(minPrice) && minPrice >= 0) {
    clauses.push(`${EFFECTIVE_PRICE} >= ${add(minPrice)}`);
  }
  const maxPrice = listing?.maxPrice !== "" && listing?.maxPrice != null ? Number(listing.maxPrice) : null;
  if (maxPrice != null && Number.isFinite(maxPrice) && maxPrice >= 0) {
    clauses.push(`${EFFECTIVE_PRICE} <= ${add(maxPrice)}`);
  }

  if (listing?.brand) {
    const like = `%${listing.brand}%`;
    const p1 = add(like);
    clauses.push(`(p.vendor ilike ${p1} or exists (select 1 from unnest(p.tags) t where t ilike ${p1}))`);
  }

  if (listing?.inStock && !listing?.outOfStock) {
    clauses.push(`(p.track_inventory = false or p.allow_backorder = true or p.quantity > 0)`);
  } else if (listing?.outOfStock && !listing?.inStock) {
    clauses.push(`p.track_inventory = true and p.allow_backorder = false and p.quantity <= 0`);
  }

  const term = String(q || listing?.q || "").trim();
  if (term) {
    const like = `%${term}%`;
    const p1 = add(like);
    clauses.push(`(
      p.name ilike ${p1}
      or p.slug ilike ${p1}
      or p.article_no ilike ${p1}
      or p.short_description ilike ${p1}
      or exists (select 1 from unnest(p.tags) t where t ilike ${p1})
    )`);
  }

  const where = clauses.join(" and ");
  const order = listingSortSql(sortSpec);
  const countRes = await pgQuery(`select count(*)::int as n from public.products p where ${where}`, params);
  const total = countRes.rows[0]?.n ?? 0;
  const offset = (page - 1) * limit;
  const listParams = [...params, limit, offset];
  const { rows } = await pgQuery(
    `select p.* from public.products p
     where ${where}
     order by ${order}
     limit $${listParams.length - 1} offset $${listParams.length}`,
    listParams
  );
  const mapped = await hydrateProducts(rows);
  return {
    products: mapped.map(serializeStoreProductSummary),
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
    query: term,
  };
}

export async function pgSuggestProducts(q, limit = 8) {
  const term = String(q || "").trim();
  if (term.length < 2) return [];
  const like = `%${term}%`;
  const { rows } = await pgQuery(
    `select p.* from public.products p
     where p.status = 'active'
       and (p.name ilike $1 or p.slug ilike $1 or p.article_no ilike $1 or exists (select 1 from unnest(p.tags) t where t ilike $1))
     order by similarity(p.name, $2) desc, p.created_at desc
     limit $3`,
    [like, term, limit]
  );
  return hydrateProducts(rows);
}

export async function pgFetchFeatured(limit = 100) {
  const { rows } = await pgQuery(
    `select * from public.products
     where status = 'active' and featured = true
     order by updated_at desc, created_at desc
     limit $1`,
    [limit]
  );
  const mapped = await hydrateProducts(rows);
  return mapped.map(serializeStoreProductSummary);
}

export async function pgFetchDeals({ filter = "all", limit = 12 } = {}) {
  const clauses = [`p.status = 'active'`, `p.is_deal = true`];
  const params = [];
  const f = String(filter || "all").toLowerCase().trim();
  const underMatch = f.match(/^under[_-]?(\d+)$/) || f.match(/^under:(\d+)$/);
  if (underMatch) {
    const max = Number(underMatch[1]);
    if (Number.isFinite(max) && max > 0) {
      params.push(max);
      clauses.push(`${EFFECTIVE_PRICE} < $${params.length}`);
    }
  }
  params.push(limit);
  const { rows } = await pgQuery(
    `select p.* from public.products p
     where ${clauses.join(" and ")}
     order by p.updated_at desc, p.created_at desc
     limit $${params.length}`,
    params
  );
  const mapped = await hydrateProducts(rows);
  return mapped.map(serializeStoreProductSummary);
}

export async function pgGetSettings() {
  const { rows } = await pgQuery(
    `select data from public.store_settings where singleton_key = $1 limit 1`,
    [SETTINGS_SINGLETON_KEY]
  );
  if (rows[0]?.data && typeof rows[0].data === "object") return rows[0].data;
  const fallback = await pgQuery(`select data from public.store_settings limit 1`);
  return fallback.rows[0]?.data && typeof fallback.rows[0].data === "object"
    ? fallback.rows[0].data
    : {};
}

export async function pgFindPublishedPage(slug) {
  const { rows } = await pgQuery(
    `select * from public.pages where slug = $1 and status = 'published' limit 1`,
    [slug]
  );
  return mapPageRow(rows[0]);
}

export async function pgListActiveCategorySlugs() {
  const { rows } = await pgQuery(
    `select slug from public.categories where status = 'active' and slug <> ''`
  );
  return rows.map((r) => r.slug);
}

export async function pgFindCategoryMeta(slug) {
  const { rows } = await pgQuery(
    `select * from public.categories where slug = $1 and status = 'active' limit 1`,
    [slug]
  );
  return mapCategoryRow(rows[0]);
}

export async function pgLoadCategories({ featuredOnly, showOnHomepageOnly, includeProductCounts }) {
  const clauses = [`c.status = 'active'`];
  if (featuredOnly) clauses.push(`c.featured = true`);
  if (showOnHomepageOnly) clauses.push(`c.show_on_homepage = true`);
  const { rows } = await pgQuery(
    `select c.*, p.name as parent_name, p.slug as parent_slug
     from public.categories c
     left join public.categories p on p.id = c.parent_id
     where ${clauses.join(" and ")}
     order by c.level asc, c.sort_order asc, c.name asc`
  );
  const mapped = rows.map(mapCategoryRow);

  let counts = new Map();
  if (includeProductCounts !== false && mapped.length) {
    const { rows: pcRows } = await pgQuery(
      `select pc.category_id, count(*)::int as n
       from public.product_categories pc
       join public.products pr on pr.id = pc.product_id
       where pr.status = 'active'
       group by pc.category_id`
    );
    counts = new Map(pcRows.map((r) => [r.category_id, r.n]));
  }

  const byParent = new Map();
  for (const cat of mapped) {
    const pid = cat.parentId || "";
    if (!byParent.has(pid)) byParent.set(pid, []);
    byParent.get(pid).push(cat);
  }

  const descendantCount = (id) => {
    let n = counts.get(id) || 0;
    for (const child of byParent.get(id) || []) n += descendantCount(child._id);
    return n;
  };

  return mapped.map((c) => ({
    ...c,
    parentIds: c.parentId ? [c.parentId] : [],
    parentName: c.parentCategory?.name || "",
    productCount: includeProductCounts !== false ? descendantCount(c._id) : 0,
    subcategoryCount: (byParent.get(c._id) || []).length,
  }));
}

export async function pgLoadCategoryDetail(slugStr, opts = {}) {
  const limit = Math.min(48, Math.max(1, Number(opts.limit) || 40));
  const page = Math.max(1, Number(opts.page) || 1);
  const skip = (page - 1) * limit;
  const sortSpec = opts.sortSpec || listingMongoSortSpec(opts.sort);
  const { rows } = await pgQuery(
    `select c.*, p.name as parent_name, p.slug as parent_slug
     from public.categories c
     left join public.categories p on p.id = c.parent_id
     where c.slug = $1 and c.status = 'active'
     limit 1`,
    [slugStr]
  );
  if (!rows[0]) return null;
  const category = mapCategoryRow(rows[0]);
  const { rows: subRows } = await pgQuery(
    `select * from public.categories
     where status = 'active' and parent_id = $1
     order by sort_order asc, name asc`,
    [category._id]
  );
  const subcategories = subRows.map(mapCategoryRow);
  const scopeIds = await categoryScopeIds(slugStr);
  const countRes = await pgQuery(
    `select count(*)::int as n
     from public.products p
     where p.status = 'active'
       and exists (
         select 1 from public.product_categories pc
         where pc.product_id = p.id and pc.category_id = any($1::uuid[])
       )`,
    [scopeIds]
  );
  const productCount = countRes.rows[0]?.n ?? 0;
  const { rows: productRows } = await pgQuery(
    `select p.* from public.products p
     where p.status = 'active'
       and exists (
         select 1 from public.product_categories pc
         where pc.product_id = p.id and pc.category_id = any($1::uuid[])
       )
     order by ${listingSortSql(sortSpec)}
     limit $2 offset $3`,
    [scopeIds, limit, skip]
  );
  const products = (await hydrateProducts(productRows)).map(serializeStoreProductSummary);
  const breadcrumbs = [];
  if (category.parentCategory?.name) {
    breadcrumbs.push({
      _id: category.parentCategory._id,
      name: category.parentCategory.name,
      slug: category.parentCategory.slug,
    });
  }
  breadcrumbs.push({ _id: category._id, name: category.name, slug: category.slug });
  return {
    category,
    subcategories,
    products,
    breadcrumbs,
    breadcrumb: breadcrumbs,
    productCount,
    totalIncludingSubcategories: productCount,
    page,
    limit,
    totalPages: Math.ceil(productCount / limit) || 1,
  };
}

export async function pgSitemapCatalog() {
  const [{ rows: products }, { rows: categories }, { rows: pages }] = await Promise.all([
    pgQuery(`select slug, updated_at from public.products where status = 'active'`),
    pgQuery(`select slug, updated_at from public.categories where status = 'active'`),
    pgQuery(`select slug, updated_at from public.pages where status = 'published'`),
  ]);
  return { products, categories, pages };
}

export async function pgLoadSlugContent(slugStr) {
  const resolved = await pgResolveProductSlug(slugStr);
  if (resolved?.slug) {
    if (resolved.slug !== slugStr) {
      return { type: "redirect", to: `/${resolved.slug}` };
    }
    const product = await pgFindProductBySlug(resolved.slug);
    if (product) {
      const relatedProducts = await pgFindRelatedProducts(product, 6);
      return {
        type: "product",
        data: serializeStoreProductDetail(product),
        relatedProducts: JSON.parse(JSON.stringify(relatedProducts)),
      };
    }
  }

  const page = await pgFindPublishedPage(slugStr);
  if (page) {
    return { type: "page", data: JSON.parse(JSON.stringify(page)) };
  }

  const catDetail = await pgLoadCategoryDetail(slugStr);
  if (catDetail) {
    return { type: "redirect", to: `/categories/${catDetail.category.slug || slugStr}` };
  }

  return null;
}
