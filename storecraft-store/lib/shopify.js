const API_VERSION = "2025-07";

export function isShopifyEnabled() {
  return Boolean(process.env.SHOPIFY_STORE_DOMAIN && process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN);
}

function money(value) {
  return Number.parseFloat(value?.amount || 0) || 0;
}

const PRODUCT_FIELDS = /* GraphQL */ `
  id
  handle
  title
  description
  descriptionHtml
  availableForSale
  featuredImage { url altText }
  images(first: 12) { nodes { url altText } }
  priceRange { minVariantPrice { amount currencyCode } }
  compareAtPriceRange { minVariantPrice { amount currencyCode } }
  variants(first: 100) {
    nodes {
      id
      title
      availableForSale
      selectedOptions { name value }
      price { amount currencyCode }
      compareAtPrice { amount currencyCode }
      image { url altText }
    }
  }
`;

/**
 * Low-level Storefront GraphQL fetch.
 * When Shopify is not configured, return null instead of throwing — same
 * defensive pattern as shopifyCart server actions, so a forgotten
 * isShopifyEnabled() check at a call site cannot 500 the page.
 */
export async function shopifyFetch({ query, variables = {}, tags = [], revalidate = 300 }) {
  if (!isShopifyEnabled()) return null;

  const response = await fetch(
    `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/${API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
      next: { revalidate, tags },
    }
  );
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.errors?.length) {
    throw new Error(result.errors?.map((error) => error.message).join("; ") || `Shopify request failed (${response.status})`);
  }
  return result.data;
}

export function mapShopifyProduct(product) {
  if (!product) return null;
  const variants = (product.variants?.nodes || []).map((variant) => ({
    id: variant.id,
    title: variant.title,
    price: money(variant.price),
    compareAtPrice: money(variant.compareAtPrice),
    availableForSale: Boolean(variant.availableForSale),
    selectedOptions: variant.selectedOptions || [],
  }));
  const price = money(product.priceRange?.minVariantPrice);
  const compareAt = money(product.compareAtPriceRange?.minVariantPrice);
  const salePrice = compareAt > price ? price : 0;
  const images = (product.images?.nodes || []).map((image) => ({ url: image.url, altText: image.altText || "" }));
  if (!images.length && product.featuredImage?.url) images.push({ url: product.featuredImage.url, altText: product.featuredImage.altText || "" });

  return {
    id: product.id,
    slug: product.handle,
    handle: product.handle,
    name: product.title,
    price,
    regularPrice: compareAt > price ? compareAt : price,
    salePrice,
    compareAt,
    images,
    image: images[0]?.url || "",
    inStock: Boolean(product.availableForSale),
    stock: product.availableForSale ? 99 : 0,
    availableForSale: Boolean(product.availableForSale),
    descriptionHtml: product.descriptionHtml || "",
    description: product.description || "",
    variants,
    source: "shopify",
  };
}

export async function getCollections() {
  const data = await shopifyFetch({
    query: `query Collections { collections(first: 100) { nodes { handle title image { url altText } } } }`,
    tags: ["shopify-collections"],
  });
  if (!data?.collections?.nodes) return [];
  return data.collections.nodes.map((collection) => ({
    handle: collection.handle,
    title: collection.title,
    image: collection.image ? { url: collection.image.url, altText: collection.image.altText || "" } : null,
  }));
}

export async function getCollectionByHandle(handle, { first = 24, after = null } = {}) {
  const data = await shopifyFetch({
    query: `query Collection($handle: String!, $first: Int!, $after: String) {
      collection(handle: $handle) {
        handle title description descriptionHtml image { url altText }
        products(first: $first, after: $after) { nodes { ${PRODUCT_FIELDS} } pageInfo { hasNextPage endCursor } }
      }
    }`,
    variables: { handle, first, after },
    tags: [`shopify-collection-${handle}`],
  });
  if (!data?.collection) return null;
  return {
    ...data.collection,
    products: data.collection.products.nodes.map(mapShopifyProduct),
    pageInfo: data.collection.products.pageInfo,
  };
}

export async function getProductByHandle(handle) {
  const data = await shopifyFetch({
    query: `query Product($handle: String!) { product(handle: $handle) { ${PRODUCT_FIELDS} } }`,
    variables: { handle },
    tags: [`shopify-product-${handle}`],
  });
  if (!data) return null;
  return mapShopifyProduct(data.product);
}

export async function getProducts({ first = 24, sortKey = "RELEVANCE", query = "" } = {}) {
  const data = await shopifyFetch({
    query: `query Products($first: Int!, $sortKey: ProductSortKeys!, $query: String) {
      products(first: $first, sortKey: $sortKey, query: $query) { nodes { ${PRODUCT_FIELDS} } }
    }`,
    variables: { first, sortKey, query: query || null },
    tags: ["shopify-products"],
  });
  if (!data?.products?.nodes) return [];
  return data.products.nodes.map(mapShopifyProduct);
}

export async function getBestSellingProducts(first = 8) {
  const bestSellers = await getCollectionByHandle("best-sellers", { first });
  return bestSellers?.products?.length ? bestSellers.products : getProducts({ first, sortKey: "BEST_SELLING" });
}

export async function getHotDealProducts(first = 12) {
  const products = await getProducts({ first: Math.max(first * 4, 40), sortKey: "BEST_SELLING" });
  return products.filter((product) => product.compareAt > product.price).slice(0, first);
}
