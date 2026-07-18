import { shopifyFetch } from "./shopify";

const CART_FIELDS = /* GraphQL */ `
  id
  checkoutUrl
  totalQuantity
  cost {
    subtotalAmount { amount currencyCode }
    totalAmount { amount currencyCode }
  }
  lines(first: 100) {
    nodes {
      id
      quantity
      cost { totalAmount { amount currencyCode } }
      merchandise {
        ... on ProductVariant {
          id
          title
          availableForSale
          price { amount currencyCode }
          image { url altText }
          product { id handle title }
          selectedOptions { name value }
        }
      }
    }
  }
`;

const CART_QUERY = `query Cart($id: ID!) { cart(id: $id) { ${CART_FIELDS} } }`;

export async function getCart(cartId) {
  if (!cartId) return null;
  const data = await shopifyFetch({ query: CART_QUERY, variables: { id: cartId }, revalidate: 0 });
  return data.cart;
}

export async function cartCreate(lines = []) {
  const data = await shopifyFetch({
    query: `mutation CartCreate($input: CartInput!) {
      cartCreate(input: $input) { cart { ${CART_FIELDS} } userErrors { field message } }
    }`,
    variables: { input: { lines } },
    revalidate: 0,
  });
  throwUserErrors(data.cartCreate.userErrors);
  return data.cartCreate.cart;
}

export async function cartLinesAdd(cartId, lines) {
  const data = await shopifyFetch({
    query: `mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) { cart { ${CART_FIELDS} } userErrors { field message } }
    }`,
    variables: { cartId, lines },
    revalidate: 0,
  });
  throwUserErrors(data.cartLinesAdd.userErrors);
  return data.cartLinesAdd.cart;
}

export async function cartLinesUpdate(cartId, lines) {
  const data = await shopifyFetch({
    query: `mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) { cart { ${CART_FIELDS} } userErrors { field message } }
    }`,
    variables: { cartId, lines },
    revalidate: 0,
  });
  throwUserErrors(data.cartLinesUpdate.userErrors);
  return data.cartLinesUpdate.cart;
}

export async function cartLinesRemove(cartId, lineIds) {
  const data = await shopifyFetch({
    query: `mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) { cart { ${CART_FIELDS} } userErrors { field message } }
    }`,
    variables: { cartId, lineIds },
    revalidate: 0,
  });
  throwUserErrors(data.cartLinesRemove.userErrors);
  return data.cartLinesRemove.cart;
}

function throwUserErrors(errors) {
  if (errors?.length) throw new Error(errors.map((error) => error.message).join("; "));
}

export function mapShopifyCart(cart) {
  if (!cart) return null;
  return {
    id: cart.id,
    checkoutUrl: cart.checkoutUrl,
    cost: {
      subtotal: Number(cart.cost?.subtotalAmount?.amount || 0),
      total: Number(cart.cost?.totalAmount?.amount || 0),
      currencyCode: cart.cost?.totalAmount?.currencyCode || "PKR",
    },
    lines: (cart.lines?.nodes || []).map((line) => ({
      id: line.id,
      productId: line.merchandise?.product?.id,
      variantId: line.merchandise?.id,
      slug: line.merchandise?.product?.handle,
      name: line.merchandise?.product?.title,
      variationLabel: line.merchandise?.title === "Default Title" ? "" : line.merchandise?.title || "",
      selectedOptions: line.merchandise?.selectedOptions || [],
      image: line.merchandise?.image?.url || "",
      price: Number(line.merchandise?.price?.amount || 0),
      unitPrice: Number(line.merchandise?.price?.amount || 0),
      quantity: line.quantity,
      availableForSale: Boolean(line.merchandise?.availableForSale),
      source: "shopify",
    })),
  };
}
