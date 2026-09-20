/**
 * Google Merchant Center–style product feed helpers (RSS 2.0 + g: namespace).
 * Spec: https://support.google.com/merchants/answer/7052112
 */
import { getSiteUrl } from "@/lib/siteUrl";
import { toPlainText } from "@/lib/sanitizeHtml";

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function absUrl(pathOrUrl, siteUrl) {
  const raw = String(pathOrUrl || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const site = cleanSite(siteUrl);
  return `${site}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

function cleanSite(siteUrl) {
  return String(siteUrl || getSiteUrl() || "").replace(/\/+$/, "");
}

function feedAvailability(product) {
  const track = product?.inventory?.trackInventory !== false;
  const qty = Number(product?.inventory?.quantity) || 0;
  const backorder = product?.inventory?.allowBackorder === true;
  if (!track || qty > 0) return "in_stock";
  if (backorder) return "backorder";
  return "out_of_stock";
}

function feedCondition(condition) {
  const c = String(condition || "new").toLowerCase();
  if (c === "used") return "used";
  if (c === "refurbished") return "refurbished";
  return "new";
}

function feedPrice(product) {
  const sale = Number(product?.pricing?.salePrice);
  const regular = Number(product?.pricing?.regularPrice) || 0;
  const scheduleOn = Boolean(product?.pricing?.saleSchedule?.enabled);
  let amount = regular;
  let onSale = false;
  if (Number.isFinite(sale) && sale > 0 && sale < regular) {
    if (!scheduleOn) {
      amount = sale;
      onSale = true;
    } else {
      const now = Date.now();
      const start = product.pricing.saleSchedule.startDate
        ? new Date(product.pricing.saleSchedule.startDate).getTime()
        : 0;
      const end = product.pricing.saleSchedule.endDate
        ? new Date(product.pricing.saleSchedule.endDate).getTime()
        : Infinity;
      if (now >= start && now <= end) {
        amount = sale;
        onSale = true;
      }
    }
  }
  if (!(amount > 0)) return { price: "", salePrice: "", regularPrice: "" };
  const regularFmt = regular > 0 ? `${regular.toFixed(2)} PKR` : "";
  return {
    price: onSale && regular > amount ? regularFmt : `${amount.toFixed(2)} PKR`,
    salePrice: onSale ? `${amount.toFixed(2)} PKR` : "",
    regularPrice: regularFmt,
  };
}

/** Hosts Google Merchant / Shopping crawlers should not use for image_link. */
function isBlockedImageHost(url) {
  return /res\.cloudinary\.com|dquier8fv|cdn\.shopify\.com/i.test(String(url || ""));
}

const IMAGE_STOP = new Set([
  "abs",
  "pcs",
  "the",
  "and",
  "for",
  "with",
  "to",
  "of",
  "in",
  "car",
  "style",
  "pair",
  "set",
  "matt",
  "matte",
  "black",
  "plastic",
  "premium",
  "quality",
  "universal",
]);

function slugTokens(slug) {
  return String(slug || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t && t.length > 2 && !IMAGE_STOP.has(t) && !/^\d+$/.test(t));
}

function imageBasename(url) {
  try {
    const clean = String(url || "").split("?")[0];
    return decodeURIComponent(clean.split("/").pop() || "").toLowerCase();
  } catch {
    return "";
  }
}

/** Prefer images whose filename matches the product slug (avoids swapped catalog photos). */
function scoreImageForSlug(slug, url) {
  const tokens = slugTokens(slug);
  const base = imageBasename(url);
  if (!tokens.length || !base) return 0;
  let hit = 0;
  for (const t of tokens.slice(0, 8)) {
    if (base.includes(t)) hit += 1;
  }
  let score = hit / Math.min(8, tokens.length);
  // Slight preference for JPEG (Merchant crawlers reprocess these more reliably).
  if (/\.jpe?g$/i.test(base)) score += 0.05;
  return score;
}

function rankedFeedImages(product, siteUrl) {
  const imgs = Array.isArray(product?.media?.images) ? product.media.images : [];
  const ranked = imgs
    .map((img, index) => {
      const url = absUrl(img?.url || "", siteUrl);
      if (!url || isBlockedImageHost(url)) return null;
      const slugScore = scoreImageForSlug(product?.slug, url);
      const mainBoost = img?.isMain ? 0.02 : 0;
      return { url, score: slugScore + mainBoost, index };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.index - b.index);
  return ranked;
}

function primaryImage(product, siteUrl) {
  const ranked = rankedFeedImages(product, siteUrl);
  if (!ranked.length) return "";
  const best = ranked[0];
  // Drop clearly swapped photos (e.g. spoiler image on a canard SKU).
  if (best.score < 0.2) return "";
  return best.url;
}

function additionalImages(product, siteUrl) {
  const primary = primaryImage(product, siteUrl);
  return rankedFeedImages(product, siteUrl)
    .map((r) => r.url)
    .filter((u) => u && u !== primary)
    .slice(0, 9);
}

function productDescription(product) {
  const plain =
    toPlainText(product.shortDescription || "") ||
    toPlainText(product.longDescription || "") ||
    product.seo?.metaDescription ||
    product.name ||
    "";
  return plain.replace(/\s+/g, " ").trim().slice(0, 5000);
}

/**
 * Map a lean Product document to Google Merchant item fields.
 * @param {object} product
 * @param {{ siteUrl?: string }} [opts]
 */
export function productToMerchantItem(product, opts = {}) {
  if (product?.seo?.excludeFromMerchantFeed === true) {
    return { id: "", title: "", link: "", image_link: "", price: "" };
  }
  const site = cleanSite(opts.siteUrl);
  const id = String(product.articleNo || product._id || "").trim();
  const title = String(product.name || "").trim().slice(0, 150);
  const link = `${site}/${product.slug}`;
  const imageLink = primaryImage(product, site);
  const brand = String(product.vendor || "CrazzyCars.pk").trim() || "CrazzyCars.pk";
  const gtin = String(product.ean || "").replace(/\D/g, "");
  const mpn = String(product.partNumber || product.articleNo || "").trim();
  const cats = Array.isArray(product.categories)
    ? product.categories.map((c) => (typeof c === "object" ? c.name : "")).filter(Boolean)
    : [];
  const { price, salePrice } = feedPrice(product);

  // Only emit g:gtin when product.ean is a real digit string (≥8). Never invent GTINs.
  // Meta rejects many items when identifier_exists=yes without a real GTIN.
  // Only claim identifiers when we have a GTIN; still send MPN when available.
  const identifierExists = gtin.length >= 8 ? "yes" : "no";

  const shippingFee = Number(opts.shippingFeePKR);
  const shippingPrice =
    Number.isFinite(shippingFee) && shippingFee >= 0
      ? `${shippingFee.toFixed(2)} PKR`
      : "250.00 PKR";

  return {
    id,
    title,
    description: productDescription(product),
    link,
    image_link: imageLink,
    additional_image_link: additionalImages(product, site),
    availability: feedAvailability(product),
    price,
    sale_price: salePrice,
    brand,
    condition: feedCondition(product.condition),
    gtin: gtin.length >= 8 ? gtin : "",
    mpn: mpn || "",
    product_type: cats.join(" > "),
    google_product_category: "5613", // Vehicle Parts & Accessories (Google taxonomy)
    identifier_exists: identifierExists,
    shipping: {
      country: "PK",
      service: "Standard",
      price: shippingPrice,
    },
    return_policy_label: "7-day-returns",
  };
}

export function buildMerchantRssXml(items, { title, link, description } = {}) {
  const site = getSiteUrl();
  const channelTitle = title || "CrazzyCars.pk Product Feed";
  const channelLink = link || site;
  const channelDesc =
    description ||
    "Premium car accessories and auto parts from CrazzyCars.pk — Pakistan COD nationwide.";

  const itemXml = (items || [])
    .filter((it) => it.id && it.title && it.link && it.image_link && it.price)
    .map((it) => {
      const extras = [];
      for (const img of it.additional_image_link || []) {
        extras.push(`      <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`);
      }
      if (it.sale_price) {
        extras.push(`      <g:sale_price>${escapeXml(it.sale_price)}</g:sale_price>`);
      }
      if (it.gtin) extras.push(`      <g:gtin>${escapeXml(it.gtin)}</g:gtin>`);
      if (it.mpn) extras.push(`      <g:mpn>${escapeXml(it.mpn)}</g:mpn>`);
      if (it.product_type) {
        extras.push(`      <g:product_type>${escapeXml(it.product_type)}</g:product_type>`);
      }
      if (it.google_product_category) {
        extras.push(
          `      <g:google_product_category>${escapeXml(it.google_product_category)}</g:google_product_category>`
        );
      }
      extras.push(`      <g:identifier_exists>${escapeXml(it.identifier_exists)}</g:identifier_exists>`);
      if (it.return_policy_label) {
        extras.push(
          `      <g:return_policy_label>${escapeXml(it.return_policy_label)}</g:return_policy_label>`
        );
      }
      if (it.shipping?.country && it.shipping?.price) {
        extras.push(`      <g:shipping>
        <g:country>${escapeXml(it.shipping.country)}</g:country>
        <g:service>${escapeXml(it.shipping.service || "Standard")}</g:service>
        <g:price>${escapeXml(it.shipping.price)}</g:price>
      </g:shipping>`);
      }

      return `    <item>
      <g:id>${escapeXml(it.id)}</g:id>
      <g:title>${escapeXml(it.title)}</g:title>
      <g:description>${escapeXml(it.description)}</g:description>
      <g:link>${escapeXml(it.link)}</g:link>
      <g:image_link>${escapeXml(it.image_link)}</g:image_link>
      <g:availability>${escapeXml(it.availability)}</g:availability>
      <g:price>${escapeXml(it.price)}</g:price>
      <g:brand>${escapeXml(it.brand)}</g:brand>
      <g:condition>${escapeXml(it.condition)}</g:condition>
${extras.join("\n")}
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <link>${escapeXml(channelLink)}</link>
    <description>${escapeXml(channelDesc)}</description>
${itemXml}
  </channel>
</rss>
`;
}
