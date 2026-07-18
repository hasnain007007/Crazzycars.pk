"use client";

import {
  addShopifyCartLine,
  getShopifyCart,
  removeShopifyCartLine,
  updateShopifyCartLine,
} from "@/app/actions/shopifyCart";

export const getCart = () => getShopifyCart();
export const cartLinesAdd = (merchandiseId, quantity = 1) => addShopifyCartLine({ merchandiseId, quantity });
export const cartLinesUpdate = (lineId, quantity) => updateShopifyCartLine({ lineId, quantity });
export const cartLinesRemove = (lineId) => removeShopifyCartLine({ lineId });
