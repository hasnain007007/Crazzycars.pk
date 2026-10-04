/**
 * Seed minimal catalog into a throwaway DB for A/B checkout.
 * Safe: never targets production DB names.
 */
import mongoose from "mongoose";
import { assertThrowawayMongoUri } from "./safe-uri.mjs";

function productBase(extra) {
  return {
    status: "active",
    codEnabled: true,
    isBulky: false,
    inventory: { quantity: 50, trackInventory: true, allowBackorder: false },
    pricing: { regularPrice: 1500, salePrice: 0, costPerItem: 400 },
    weight: 1,
    weightUnit: "kg",
    variants: [],
    variationCombinations: [],
    simpleVariations: [],
    media: { images: [{ url: "https://example.com/a.jpg", isMain: true }] },
    ...extra,
  };
}

export async function seedAbFixture(uri) {
  assertThrowawayMongoUri(uri, "seedAbFixture");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  await Promise.all(
    ["products", "coupons", "customers", "orders", "settings", "shippingzones", "cartsessions"].map(
      (c) => db.collection(c).deleteMany({})
    )
  );

  const simpleId = new mongoose.Types.ObjectId();
  const bulkyId = new mongoose.Types.ObjectId();
  const bodyKitId = new mongoose.Types.ObjectId();
  const variantId = new mongoose.Types.ObjectId();
  const variantOptId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();

  await db.collection("products").insertMany([
    productBase({
      _id: simpleId,
      name: "AB Simple Splitter",
      slug: "ab-simple-splitter",
      articleNo: "AB-SIMPLE-1",
    }),
    productBase({
      _id: bulkyId,
      name: "AB Bulky Spoiler",
      slug: "ab-bulky-spoiler",
      articleNo: "AB-BULKY-1",
      isBulky: true,
      inventory: { quantity: 20, trackInventory: true, allowBackorder: false },
      pricing: { regularPrice: 8000, salePrice: 0, costPerItem: 2000 },
      weight: 8,
    }),
    productBase({
      _id: bodyKitId,
      name: "Honda Civic Body Kit D1",
      slug: "honda-civic-body-kit-d1",
      articleNo: "AB-KIT-1",
      isBulky: true,
      inventory: { quantity: 5, trackInventory: true, allowBackorder: false },
      pricing: { regularPrice: 45000, salePrice: 0, costPerItem: 20000 },
      weight: 25,
    }),
    productBase({
      _id: variantId,
      name: "AB Variant Mirror",
      slug: "ab-variant-mirror",
      articleNo: "AB-MIR-1",
      inventory: { quantity: 0, trackInventory: true, allowBackorder: false },
      pricing: { regularPrice: 2500, salePrice: 0, costPerItem: 800 },
      variants: [
        {
          _id: variantOptId,
          combination: ["Black", "Left"],
          sku: "AB-MIR-BL",
          stock: 1,
          price: 2500,
          trackStock: true,
          isAvailable: true,
        },
      ],
    }),
  ]);

  await db.collection("coupons").insertOne({
    code: "ABTEST10",
    status: "active",
    discountType: "percentage",
    discountValue: 10,
    minOrderAmount: 0,
    maxDiscount: 0,
    usageLimit: 1000,
    usedCount: 0,
    expiryDate: new Date(Date.now() + 86400000 * 30),
    appliesTo: "all",
    categoryIds: [],
  });

  await db.collection("customers").insertOne({
    _id: customerId,
    firstName: "Existing",
    lastName: "Customer",
    name: "Existing Customer",
    email: "existing-ab@example.com",
    phone: "03001112233",
    password: "",
    passwordHash: "",
    isActive: true,
    addresses: [
      {
        street: "45 Existing Ave",
        city: "Lahore",
        state: "Punjab",
        province: "Punjab",
        country: "Pakistan",
        isDefault: true,
      },
    ],
  });

  await db.collection("settings").insertOne({
    singletonKey: "default",
    storePayment: {
      codEnabled: true,
      minimumOrderAmount: 0,
      freeShippingThreshold: 0,
      flatDeliveryCharge: 250,
      advancePaymentAmount: 250,
      advancePaymentMessageEnabled: true,
      advancePaymentDiscountEnabled: false,
      freeShippingOnAdvancePayment: false,
    },
    pakistaniPaymentMethods: {
      cod: { enabled: true, label: "Cash on Delivery" },
      bankTransfer: {
        enabled: true,
        label: "Bank Transfer",
        bankName: "Meezan Bank",
        accountNumber: "0123456789",
        accountTitle: "Crazzycars",
        iban: "PK00MEZN0000000000000000",
      },
      meezan: {
        enabled: true,
        label: "Meezan Bank",
        bankName: "Meezan Bank",
        accountNumber: "0123456789",
        accountTitle: "Crazzycars",
        iban: "PK00MEZN0000000000000000",
      },
    },
    whatsapp: { number: "03284010007", enabled: true },
    storefront: {
      checkoutSuccess: {
        paymentConfirmedMessage:
          "Your payment has been confirmed. Please send a screenshot of your full payment to our WhatsApp at {whatsapp}.",
        codAdvanceNote:
          "Thank you for your order! Please send a screenshot of your advance payment to our WhatsApp at {whatsapp}.",
      },
    },

    orderNumber: {
      prefix: "AB",
      separator: "-",
      includeYear: false,
      includeMonth: false,
      startingNumber: 1,
      currentSequence: 0,
    },
    general: {
      storeName: "Crazzycars.pk AB",
      currency: "PKR",
      email: "info@example.com",
      phone: "+92 300 0000000",
    },
    seo: {
      facebookPixelId: "",
      metaCapiAccessToken: "",
      metaCapiTestEventCode: "",
    },
    courier: {
      postexApiKey: "",
      postexAccountId: "",
      postexAddressCode: "",
      autoCreateShipment: false,
    },
    notifications: {
      emailOnNewOrder: true,
      notificationEmail: "",
    },
  });

  await db.collection("shippingzones").insertOne({
    name: "Punjab",
    countries: ["Pakistan"],
    cities: ["Lahore"],
    rates: [{ name: "Standard", price: 250, minWeight: 0, maxWeight: 999 }],
    isActive: true,
  });

  await mongoose.disconnect();

  return {
    simpleId: String(simpleId),
    bulkyId: String(bulkyId),
    bodyKitId: String(bodyKitId),
    variantId: String(variantId),
    variantOptId: String(variantOptId),
    customerId: String(customerId),
    couponCode: "ABTEST10",
  };
}
