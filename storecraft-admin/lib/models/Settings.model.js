import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, default: "" },
    publicId: { type: String, default: "" },
  },
  { _id: false }
);

const settingsSchema = new mongoose.Schema(
  {
    singletonKey: { type: String, default: "default", unique: true },
    orderNumber: {
      prefix: { type: String, default: "ORD" },
      separator: { type: String, default: "-" },
      includeYear: { type: Boolean, default: true },
      includeMonth: { type: Boolean, default: false },
      startingNumber: { type: Number, default: 1 },
      currentSequence: { type: Number, default: 0 },
    },
    checkout: {
      requireAccount: { type: Boolean, default: false },
      allowGuestCheckout: { type: Boolean, default: true },
      showLoginPrompt: { type: Boolean, default: true },
    },
    general: {
      storeName: { type: String, default: 'Crazzycars.pk' },
      showStoreName: { type: Boolean, default: true },
      phone: { type: String, default: "+92 324 422 0007" },
      email: { type: String, default: "info@crazzycars.pk" },
      website: { type: String, default: "" },
      logo: imageSchema,
      logoUrl: { type: String, default: "" },
      footerText: { type: String, default: "" },
      currency: { type: String, default: "PKR" },
      timezone: { type: String, default: "Asia/Karachi" },
      defaultCountry: { type: String, default: "Pakistan" },
      defaultCountryCode: { type: String, default: "PK" },
      defaultCurrency: { type: String, default: "PKR" },
      defaultPhonePrefix: { type: String, default: "+92" },
      address: { type: String, default: "" },
    },
    appearance: {
      primaryColor: { type: String, default: "#C41E1E" },
      secondaryColor: { type: String, default: "#111111" },
      accentColor: { type: String, default: "#C41E1E" },
      fontFamily: { type: String, default: "var(--font-inter), system-ui, sans-serif" },
      buttonStyle: { type: String, default: "rounded" },
      borderRadius: { type: String, default: "8px" },
    },
    checkoutMessages: {
      orderSuccessMessage: { type: String, default: "Order Placed! We will deliver to your doorstep." },
      orderSuccessSubtext: { type: String, default: "Thank you for shopping with Crazzycars.pk" },
      codInstructions: { type: String, default: "Pay cash when your order arrives." },
      shippingNote: { type: String, default: "Free delivery on orders over Rs. 2,999" },
      cartEmptyMessage: { type: String, default: "Your cart is empty" },
    },
    storePayment: {
      codEnabled: { type: Boolean, default: true },
      codLabel: { type: String, default: "Cash on Delivery" },
      codDescription: { type: String, default: "Pay when your order arrives at your doorstep." },
      codFee: { type: Number, default: 0 },
      minimumOrderAmount: { type: Number, default: 0 },
      freeShippingThreshold: { type: Number, default: 2999 },
      majorCitiesDays: { type: String, default: "2-3" },
      otherAreasDays: { type: String, default: "4-7" },
      deliveryNote: {
        type: String,
        default: "Free delivery on orders over Rs. 2,999",
      },
      freeShippingOnAdvancePayment: { type: Boolean, default: true },
      freeShippingOnOrderAbove: { type: Number, default: 10000 },
      freeShippingOnOrderAboveEnabled: { type: Boolean, default: true },
      advancePaymentMessage: {
        type: String,
        default:
          "To confirm your order, please pay at least Rs. 500 in advance as delivery charges paid to TCS courier. Send payment screenshot on WhatsApp to confirm.",
      },
      advancePaymentAmount: { type: Number, default: 500 },
      advancePaymentMessageEnabled: { type: Boolean, default: true },
      advancePaymentMessageTitle: { type: String, default: "Confirm Your Order" },
    },
    courier: {
      defaultCourier: { type: String, default: "Postex" },
      originCity: { type: String, default: "Sialkot" },
      postexApiKey: { type: String, default: "" },
      postexAccountId: { type: String, default: "" },
      postexAddressCode: { type: String, default: "" },
      autoCreateShipment: { type: Boolean, default: false },
      sendTrackingToCustomer: { type: Boolean, default: true },
      trackingMessageTemplate: {
        type: String,
        default:
          "Your order #{orderNumber} has been shipped via Postex! Track here: {trackingUrl}",
      },
    },
    notifications: {
      emailOnNewOrder: { type: Boolean, default: true },
      emailOnLowStock: { type: Boolean, default: true },
      emailOnNewReview: { type: Boolean, default: false },
      notificationEmail: { type: String, default: "" },
    },
    payment: {
      stripe: {
        publishableKey: { type: String, default: "" },
        secretKey: { type: String, default: "" },
        mode: { type: String, enum: ["sandbox", "live"], default: "sandbox" },
        webhookSecret: { type: String, default: "" },
      },
      paypal: {
        clientId: { type: String, default: "" },
        clientSecret: { type: String, default: "" },
        mode: { type: String, enum: ["sandbox", "live"], default: "sandbox" },
      },
    },
    pakistaniPaymentMethods: {
      cod: {
        enabled: { type: Boolean, default: true },
        label: { type: String, default: "Cash on Delivery" },
        icon: { type: String, default: "cod" },
      },
      jazzcash: {
        enabled: { type: Boolean, default: false },
        label: { type: String, default: "JazzCash" },
        accountNumber: { type: String, default: "" },
        accountName: { type: String, default: "" },
        icon: { type: String, default: "jazzcash" },
      },
      easypaisa: {
        enabled: { type: Boolean, default: false },
        label: { type: String, default: "Easypaisa" },
        accountNumber: { type: String, default: "" },
        accountName: { type: String, default: "" },
        icon: { type: String, default: "easypaisa" },
      },
      bankTransfer: {
        enabled: { type: Boolean, default: false },
        label: { type: String, default: "Bank Transfer" },
        bankName: { type: String, default: "" },
        accountNumber: { type: String, default: "" },
        accountTitle: { type: String, default: "" },
        iban: { type: String, default: "" },
        icon: { type: String, default: "bank" },
      },
      hbl: {
        enabled: { type: Boolean, default: false },
        label: { type: String, default: "HBL" },
        accountNumber: { type: String, default: "" },
        accountTitle: { type: String, default: "" },
        icon: { type: String, default: "hbl" },
      },
      meezan: {
        enabled: { type: Boolean, default: false },
        label: { type: String, default: "Meezan Bank" },
        accountNumber: { type: String, default: "" },
        accountTitle: { type: String, default: "" },
        icon: { type: String, default: "meezan" },
      },
      ubl: {
        enabled: { type: Boolean, default: false },
        label: { type: String, default: "UBL" },
        accountNumber: { type: String, default: "" },
        accountTitle: { type: String, default: "" },
        icon: { type: String, default: "ubl" },
      },
    },
    seo: {
      defaultMetaTitle: { type: String, default: "" },
      defaultMetaDescription: { type: String, default: "" },
      metaTitle: { type: String, default: "" },
      metaDescription: { type: String, default: "" },
      metaKeywords: { type: String, default: "" },
      ogTitle: { type: String, default: "" },
      ogDescription: { type: String, default: "" },
      ogImage: { type: String, default: "" },
      googleAnalyticsId: { type: String, default: "" },
      googleSearchConsoleId: { type: String, default: "" },
      facebookPixelId: { type: String, default: "" },
      canonicalUrl: { type: String, default: "" },
      robotsTxt: { type: String, default: "index, follow" },
      themeDefault: { type: String, enum: ["light", "dark", "system"], default: "light" },
    },
    emailTemplates: {
      orderConfirmation: { subject: { type: String, default: "" }, body: { type: String, default: "" } },
      orderShipped: { subject: { type: String, default: "" }, body: { type: String, default: "" } },
      passwordReset: { subject: { type: String, default: "" }, body: { type: String, default: "" } },
    },
    aboutPage: {
      hero: {
        badge: { type: String, default: "Our Story" },
        title: { type: String, default: "Pakistan's Premier Car Accessories Store" },
        subtitle: {
          type: String,
          default:
            `At ${process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk"}, we help drivers upgrade their ride with premium seat covers, floor mats, steering wraps, and car care essentials — delivered across Pakistan.`,
        },
      },
      story: {
        badge: { type: String, default: "Who We Are" },
        title: { type: String, default: "Built for Pakistani Car Enthusiasts" },
        paragraph1: {
          type: String,
          default:
            `${process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk"} was founded in Sialkot, Pakistan, by car enthusiasts who wanted premium accessories at fair prices — without compromising on quality.`,
        },
        paragraph2: {
          type: String,
          default:
            "From seat covers and floor mats to LED lights and organizers, every product is chosen for real-world use in Pakistani conditions — heat, dust, and daily driving.",
        },
        paragraph3: {
          type: String,
          default:
            "Today we serve customers from Lahore to Karachi and beyond, with Cash on Delivery, responsive support, and accessories that make every drive more comfortable and stylish.",
        },
      },
      stats: [
        {
          number: { type: String, default: "" },
          label: { type: String, default: "" },
        },
      ],
      promise: {
        title: { type: String, default: `${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'} Promise` },
        paragraph1: {
          type: String,
          default:
            "We promise honest product descriptions, fair pricing, and accessories we would use on our own vehicles. Every item is checked before it ships.",
        },
        paragraph2: {
          type: String,
          default:
            `Your safety, satisfaction and style are at the heart of everything we do. That is not just a promise — that is the ${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'} way.`,
        },
      },
      faq: [
        {
          question: { type: String, default: "" },
          answer: { type: String, default: "" },
        },
      ],
      values: [
        {
          icon: { type: String, default: "" },
          title: { type: String, default: "" },
          description: { type: String, default: "" },
        },
      ],
    },
    contactPage: {
      hero: {
        badge: { type: String, default: "Get In Touch" },
        title: { type: String, default: "We Would Love to Hear From You" },
        subtitle: {
          type: String,
          default: "Questions about an order, product advice, or just want to say hello? We are always happy to help.",
        },
      },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
      whatsapp: { type: String, default: "" },
      address: {
        line1: { type: String, default: "" },
        line2: { type: String, default: "" },
        city: { type: String, default: "Sialkot" },
        country: { type: String, default: "Pakistan" },
      },
      hours: {
        weekdays: { type: String, default: "Monday - Saturday: 9am - 9pm PKT" },
        weekend: { type: String, default: "Sunday: 10am - 6pm PKT" },
        closed: { type: String, default: "Sunday: Closed" },
      },
      responseTime: { type: String, default: "We reply to all emails within 24 hours" },
      socialLinks: {
        instagram: { type: String, default: "" },
        facebook: { type: String, default: "" },
        tiktok: { type: String, default: "" },
        twitter: { type: String, default: "" },
      },
      faq: [
        {
          question: { type: String, default: "" },
          answer: { type: String, default: "" },
        },
      ],
    },
    storefront: {
      checkoutSuccess: {
        title: { type: String, default: "" },
        successTitle: { type: String, default: "" },
        thankYouMessage: { type: String, default: "" },
        successMessage: { type: String, default: "" },
        failedTitle: { type: String, default: "" },
        failedMessage: { type: String, default: "" },
        emailSubject: { type: String, default: "" },
        emailMessage: { type: String, default: "" },
        paymentConfirmedMessage: { type: String, default: "" },
        footerMessage: { type: String, default: "" },
      },
    },
    whatsapp: {
      enabled: { type: Boolean, default: false },
      number: { type: String, default: "" },
      message: {
        type: String,
        default: "Hi! I have a question about car accessories from Crazzycars.pk.",
      },
      showInNav: { type: Boolean, default: false },
      showInFooter: { type: Boolean, default: true },
      showFloating: { type: Boolean, default: true },
      position: {
        type: String,
        enum: ["bottom-left", "bottom-right"],
        default: "bottom-left",
      },
      buttonColor: { type: String, default: "#25D366" },
    },
    whatsappTemplates: {
      customerOrderConfirmation: {
        enabled: { type: Boolean, default: true },
        template: {
          type: String,
          default: `Assalam o Alaikum {customerName}! 🚗

Your order from *Crazzycars.pk* has been confirmed!

📦 *Order:* #{orderNumber}
📅 *Date:* {orderDate}

🛍️ *Items:*
{itemsList}

💰 *Order Summary:*
Subtotal: Rs. {subtotal}
Shipping: {shipping}
*Total: Rs. {total}*

💳 *Payment:* {paymentMethod}
{paymentInstructions}

🚚 *Delivery Address:*
{customerName}
{address}, {city}, {province}
📞 {customerPhone}

🕐 Estimated Delivery: 2-4 business days
{trackingSection}
Need help? Call us: 📞 {storePhone}

Thank you for shopping with Crazzycars.pk! 🚗✨`,
        },
      },
      adminNewOrder: {
        enabled: { type: Boolean, default: true },
        template: {
          type: String,
          default: `🆕 *NEW ORDER* #{orderNumber}

👤 Customer: {customerName}
📞 Phone: {customerPhone}
🏙️ City: {city}, {province}

🛍️ Items:
{itemsList}

💰 Total: *Rs. {total}*
💳 Payment: {paymentMethod}

📍 Address: {address}, {city}

🔗 View order in admin: {adminOrderUrl}`,
        },
      },
      orderShipped: {
        enabled: { type: Boolean, default: true },
        template: {
          type: String,
          default: `📦 *Order Shipped!*

Assalam o Alaikum {customerName}!

Your Crazzycars.pk order #{orderNumber} has been shipped via *{courier}*!

🔍 *Tracking Number:* {trackingNumber}
🔗 Track here: {trackingUrl}

🏠 Delivery Address:
{address}, {city}

Questions? Call: 📞 {storePhone}

Thank you! 🚗✨`,
        },
      },
    },
    announcementBar: {
      enabled: { type: Boolean, default: true },
      items: [
        {
          text: { type: String, default: "" },
          link: { type: String, default: "" },
          enabled: { type: Boolean, default: true },
        },
      ],
      backgroundColor: { type: String, default: "#111111" },
      textColor: { type: String, default: "#FFFFFF" },
    },
    trustBadges: {
      enabled: { type: Boolean, default: true },
      items: [
        {
          icon: { type: String, default: "" },
          title: { type: String, default: "" },
          description: { type: String, default: "" },
          enabled: { type: Boolean, default: true },
        },
      ],
    },
    productImageWatermark: {
      enabled: { type: Boolean, default: true },
      text: { type: String, default: "Crazzycars.pk" },
      position: { type: String, default: "bottom-right" },
      opacity: { type: Number, default: 0.7 },
      fontSize: { type: Number, default: 24 },
      color: { type: String, default: "#FFFFFF" },
    },
    productBadges: {
      enabled: { type: Boolean, default: true },
      showSaleBadge: { type: Boolean, default: true },
      showNewBadge: { type: Boolean, default: true },
      showCodBadge: { type: Boolean, default: true },
      saleBadgeText: { type: String, default: "Sale" },
      newBadgeText: { type: String, default: "New" },
      saleBadgeColor: { type: String, default: "#C41E1E" },
      newBadgeColor: { type: String, default: "#111111" },
      codBadgeText: { type: String, default: "Cash on delivery" },
      codBadgeColor: { type: String, default: "#6B7280" },
      discreteShipping: {
        enabled: { type: Boolean, default: true },
        title: { type: String, default: "Fast Nationwide Delivery" },
        description: {
          type: String,
          default: "We deliver car accessories across Pakistan with tracking where available.",
        },
      },
      trustBadges: [
        {
          icon: { type: String, default: "🛡️" },
          text: { type: String, default: "" },
          subtext: { type: String, default: "" },
          enabled: { type: Boolean, default: true },
        },
      ],
      qualityBadges: [
        {
          text: { type: String, default: "" },
          enabled: { type: Boolean, default: true },
        },
      ],
      asianImportsBadge: {
        enabled: { type: Boolean, default: true },
        title: { type: String, default: "Quality Assured" },
        description: {
          type: String,
          default:
            "We source premium car accessories from trusted manufacturers. Every product is quality-checked before it ships.",
        },
      },
    },
    brandStory: {
      enabled: { type: Boolean, default: true },
      badge: { type: String, default: "Our Story" },
      heading: { type: String, default: "Built for Pakistani Car Enthusiasts" },
      subheading: { type: String, default: "Pakistan's Premier Car Accessories Store" },
      description: {
        type: String,
        default:
          "Crazzycars.pk was founded in Sialkot to bring premium seat covers, floor mats, steering wraps, and car care products to drivers across Pakistan — with COD nationwide.",
      },
      buttonText: { type: String, default: "Shop Car Accessories" },
      buttonLink: { type: String, default: "/about-us" },
      image1: { type: String, default: "" },
      image2: { type: String, default: "" },
      stats: [
        {
          value: { type: String, default: "" },
          label: { type: String, default: "" },
        },
      ],
    },
    megaMenu: {
      enabled: { type: Boolean, default: true },
      trigger: { type: String, enum: ["hover", "click"], default: "hover" },
      showImages: { type: Boolean, default: true },
      showSubcategories: { type: Boolean, default: true },
      columns: { type: Number, default: 4 },
      featuredTitle: { type: String, default: "Shop By Category" },
      items: [
        {
          label: { type: String, default: "" },
          url: { type: String, default: "" },
          href: { type: String, default: "" },
          featured: { type: Boolean, default: false },
          mega: { type: Boolean, default: false },
          columns: [
            {
              heading: { type: String, default: "" },
              title: { type: String, default: "" },
              links: [
                {
                  label: { type: String, default: "" },
                  url: { type: String, default: "" },
                  href: { type: String, default: "" },
                },
              ],
            },
          ],
        },
      ],
    },
    homepageSettings: {
      announcementMessages: [
        {
          text: { type: String, default: "" },
          isActive: { type: Boolean, default: true },
        },
      ],
      announcementBgColor: { type: String, default: "#111111" },
      heroHeadline: { type: String, default: "UPGRADE YOUR RIDE." },
      heroSubtext: {
        type: String,
        default: "Premium car accessories delivered across Pakistan. Quality products for every make and model.",
      },
      heroCtaText: { type: String, default: "Shop Now" },
      heroCtaUrl: { type: String, default: "/shop" },
      whyChooseUs: [
        {
          icon: { type: String, default: "🚚" },
          title: { type: String, default: "" },
          description: { type: String, default: "" },
          isActive: { type: Boolean, default: true },
        },
      ],
      brands: [
        {
          name: { type: String, default: "" },
          isActive: { type: Boolean, default: true },
          order: { type: Number, default: 0 },
        },
      ],
      flashSaleEnabled: { type: Boolean, default: true },
      flashSaleTitle: { type: String, default: "Up to 50% Off" },
      flashSaleEndTime: { type: Date, default: null },
      sections: {
        showShopByCar: { type: Boolean, default: true },
        showFlashSale: { type: Boolean, default: true },
        showBrands: { type: Boolean, default: true },
        showWhyChooseUs: { type: Boolean, default: true },
        showCategories: { type: Boolean, default: true },
        showBestSellers: { type: Boolean, default: true },
        showHotDeals: { type: Boolean, default: true },
      },
      hotDeals: {
        enabled: { type: Boolean, default: true },
        title: { type: String, default: "🔥 Hot Deals" },
        subtitle: { type: String, default: "Limited time offers" },
        tabs: [
          {
            label: { type: String, default: "" },
            filter: { type: String, default: "all" },
            enabled: { type: Boolean, default: true },
            order: { type: Number, default: 0 },
          },
        ],
      },
      bestSellers: {
        enabled: { type: Boolean, default: true },
        title: { type: String, default: "Best Sellers" },
        tabs: [
          {
            label: { type: String, default: "" },
            categorySlug: { type: String, default: "all" },
            enabled: { type: Boolean, default: true },
            order: { type: Number, default: 0 },
          },
        ],
      },
      sectionOrder: [
        {
          id: { type: String, default: "" },
          label: { type: String, default: "" },
          enabled: { type: Boolean, default: true },
          order: { type: Number, default: 0 },
        },
      ],
      sectionTitles: {
        categories: { type: String, default: "Shop by Category" },
        bestSellers: { type: String, default: "Best Sellers" },
        hotDeals: { type: String, default: "🔥 Hot Deals" },
        flashSale: { type: String, default: "Flash Sale" },
        brands: { type: String, default: "Trusted Brands" },
        whyChooseUs: { type: String, default: "Why Choose Us" },
        shopByCar: { type: String, default: "Find Parts For Your Car" },
      },
      categories: {
        title: { type: String, default: "Shop by Category" },
        viewAllText: { type: String, default: "View all →" },
      },
    },
    footer: {
      tagline: { type: String, default: "Pakistan's Premier Car Accessories Store" },
      social: {
        facebook: { type: String, default: "" },
        instagram: { type: String, default: "" },
        twitter: { type: String, default: "" },
        tiktok: { type: String, default: "" },
        youtube: { type: String, default: "" },
        whatsapp: { type: String, default: "" },
      },
      columns: [
        {
          title: { type: String, default: "" },
          links: [
            {
              label: { type: String, default: "" },
              url: { type: String, default: "" },
              isExternal: { type: Boolean, default: false },
            },
          ],
        },
      ],
      contact: {
        address: { type: String, default: "" },
        email: { type: String, default: "" },
        phone: { type: String, default: "" },
      },
      copyrightText: { type: String, default: "© 2025 Crazzycars.pk. All Rights Reserved." },
      showLogoInFooter: { type: Boolean, default: true },
      companyName: { type: String, default: "Crazzycars.pk" },
      companyNumber: { type: String, default: "" },
      vatNumber: { type: String, default: "" },
      registeredAddress: { type: String, default: "Sialkot, Punjab, Pakistan" },
      trustpilotUrl: { type: String, default: "" },
      shopLinks: [
        {
          label: { type: String, default: "" },
          href: { type: String, default: "" },
          enabled: { type: Boolean, default: true },
        },
      ],
      customerCareLinks: [
        {
          label: { type: String, default: "" },
          href: { type: String, default: "" },
          enabled: { type: Boolean, default: true },
        },
      ],
      categoriesLinks: [
        {
          label: { type: String, default: "" },
          href: { type: String, default: "" },
          enabled: { type: Boolean, default: true },
        },
      ],
      contactEmail: { type: String, default: "" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
      showPaymentIcons: { type: Boolean, default: true },
      paymentMethods: [
        {
          type: { type: String, default: "" },
          name: { type: String, default: "" },
          enabled: { type: Boolean, default: true },
        },
      ],
      newsletter: {
        enabled: { type: Boolean, default: true },
        heading: { type: String, default: "Get Exclusive Car Accessories Deals" },
        subtext: { type: String, default: "Get the Latest Deals" },
        buttonText: { type: String, default: "Subscribe" },
      },
      appLinks: {
        appStore: { type: String, default: "" },
        playStore: { type: String, default: "" },
      },
    },
  },
  { timestamps: true }
);

export default mongoose.models.Settings || mongoose.model("Settings", settingsSchema);

export const SETTINGS_SINGLETON_KEY = "default";
