"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useCart } from "@/context/CartContext";
import { resolveProductContentId, trackViewContent } from "@/lib/metaPixel";
import { ProductCard } from "./ProductCard";
import { CountdownTimer } from "./CountdownTimer";
import ProductVariations from "./ProductVariations";
import ProductReviews, { StarDisplay } from "./ProductReviews";
import { formatPrice } from "@/lib/currency";
import { useStoreSettings } from "@/context/StoreSettingsContext";
import { WatermarkedImage } from "./WatermarkedImage";
import { VehicleCompatibilitySection } from "./VehicleCompatibilitySection";
import { normalizeProductImageWatermark } from "@/lib/productImageWatermark";

const WISHLIST_KEY = "sialkot_wishlist";
const COMPARE_KEY = "sialkot_compare";

function getWishlist() {
  try {
    const stored = localStorage.getItem(WISHLIST_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveWishlist(items) {
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("sialkot-wishlist-change"));
    }
  } catch {
    /* ignore */
  }
}

function getCompare() {
  try {
    const stored = localStorage.getItem(COMPARE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCompare(items) {
  try {
    localStorage.setItem(COMPARE_KEY, JSON.stringify(items));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("sialkot-compare-change"));
    }
  } catch {
    /* ignore */
  }
}

const DEFAULT_PRODUCT_PAGE_TRUST_BADGES = [
  { icon: "🛡️", text: "Premium Quality", subtext: "Exceptional Standards", enabled: true },
  { icon: "↩️", text: "7 Day Returns", subtext: "Hassle Free Returns", enabled: true },
  { icon: "🔒", text: "Secure Payment", subtext: "100% Secure Checkout", enabled: true },
  { icon: "🚚", text: "Fast Dispatch", subtext: "Quick Delivery", enabled: true },
];

function normalizeProductTrustBadges(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  const iconFallback = ["🛡️", "↩️", "🔒", "🚚"];
  return arr.map((b, i) => {
    const d = DEFAULT_PRODUCT_PAGE_TRUST_BADGES[Math.min(i, DEFAULT_PRODUCT_PAGE_TRUST_BADGES.length - 1)];
    const text = String(b?.text ?? b?.title ?? "").trim();
    const subtext = String(b?.subtext ?? b?.description ?? "").trim();
    const icon = String(b?.icon ?? "").trim() || iconFallback[i % iconFallback.length] || d.icon;
    return {
      icon,
      text: text || d.text,
      subtext,
      enabled: b?.enabled !== false,
    };
  });
}

function toPlain(html) {
  let s = String(html || "");
  for (let i = 0; i < 3; i++) {
    if (!/&(?:amp|lt|gt|quot|nbsp|#0*3[468]|#0*39|#x27);/i.test(s)) break;
    s = s
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#0*39;/g, "'")
      .replace(/&#x27;/gi, "'")
      .replace(/&nbsp;/gi, " ");
  }
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncatePlain(text, maxLen = 180) {
  const plain = String(text || "").trim();
  if (!plain || plain.length <= maxLen) return plain;
  const cut = plain.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

/** Decode escaped HTML then strip scripts/handlers (server already sanitizes). */
function sanitizeClientHtml(html) {
  let raw = String(html || "");
  if (!raw) return "";
  // Import/legacy data often stores `&lt;p&gt;…` instead of real tags.
  for (let i = 0; i < 3; i++) {
    if (!/&(?:amp|lt|gt|quot|nbsp|#0*3[468]|#0*39|#x27);/i.test(raw)) break;
    raw = raw
      .replace(/&amp;/gi, "&")
      .replace(/&#0*38;/g, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&#0*60;/g, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&#0*62;/g, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#0*34;/g, '"')
      .replace(/&#0*39;/g, "'")
      .replace(/&#x27;/gi, "'")
      .replace(/&nbsp;/gi, " ");
  }
  return raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

function AccordionSection({ id, title, icon, isOpen, onToggle, children, badge }) {
  return (
    <div style={{ borderBottom: "1px solid #E5E5E5" }}>
      <button
        type="button"
        onClick={() => onToggle(id)}
        style={{
          width: "100%",
          padding: "18px 0",
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#111111",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {title}
          </span>
          {badge ? (
            <span
              style={{
                background: "#e6f7f5",
                color: "#D4AF37",
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 99,
              }}
            >
              {badge}
            </span>
          ) : null}
        </div>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#D4AF37"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{
            flexShrink: 0,
            transition: "transform 0.25s ease",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
          aria-hidden
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <div
        style={{
          maxHeight: isOpen ? "none" : "0",
          overflow: isOpen ? "visible" : "hidden",
          transition: isOpen ? undefined : "max-height 0.35s ease",
        }}
        hidden={!isOpen}
        aria-hidden={!isOpen}
      >
        {isOpen ? <div style={{ paddingBottom: 24 }}>{children}</div> : null}
      </div>
    </div>
  );
}

export function ProductDetailMedico({ product: initialProduct = null, relatedProducts = null }) {
  const { addItem } = useCart();
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug ? String(params.slug) : "";

  const [product, setProduct] = useState(initialProduct);
  const [loading, setLoading] = useState(!initialProduct);
  const [related, setRelated] = useState(
    Array.isArray(relatedProducts) && relatedProducts.length ? relatedProducts : []
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [matchedCombo, setMatchedCombo] = useState(null);
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [openSection, setOpenSection] = useState(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [reviewAverage, setReviewAverage] = useState(null);
  const [productBadges, setProductBadges] = useState(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isCompared, setIsCompared] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState(null);
  const { productImageWatermark: rawWatermark } = useStoreSettings();
  const productImageWatermark = normalizeProductImageWatermark(rawWatermark);

  useEffect(() => {
    fetch("/api/store/shipping-banner")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setDeliveryInfo(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const s = data?.data || data;
        setProductBadges(s?.productBadges ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug || initialProduct) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/products/${encodeURIComponent(slug)}`);
        const json = await res.json();
        if (!cancelled) {
          if (json.success) {
            const p = json.product;
            setProduct(p);
          } else setProduct(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, initialProduct]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!product?.slug) return;

      if (Array.isArray(relatedProducts) && relatedProducts.length > 0) {
        if (!cancelled) {
          setRelated(
            relatedProducts.filter((p) => p.slug && p.slug !== product.slug).slice(0, 6)
          );
        }
        return;
      }

      const catSlug = product?.categories?.[0]?.slug;
      try {
        const url = catSlug
          ? `/api/products?category=${encodeURIComponent(catSlug)}&limit=8`
          : `/api/products?limit=8&sort=newest`;
        const res = await fetch(url);
        const json = await res.json();
        if (cancelled || !json.success) return;
        setRelated(
          (json.products || [])
            .filter((p) => p.slug && p.slug !== product.slug)
            .slice(0, 6)
        );
      } catch {
        if (!cancelled) setRelated([]);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally omit relatedProducts from deps — parent may pass a new [] each SSR pass.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.slug, product?.categories?.[0]?.slug]);

  useEffect(() => {
    setReviewCount(0);
    setReviewAverage(null);
    setSelectedIndex(0);
  }, [product?.id, product?._id, product?.slug]);

  useEffect(() => {
    const pid = product?._id ?? product?.id;
    if (pid == null) {
      setIsWishlisted(false);
      setIsCompared(false);
      return;
    }
    const wid = String(pid);
    setIsWishlisted(getWishlist().some((item) => String(item.id) === wid));
    setIsCompared(getCompare().some((item) => String(item.id) === wid));
  }, [product?._id, product?.id]);



  const regularPrice = Number(product?.regularPrice ?? product?.compareAt ?? product?.pricing?.regularPrice ?? product?.price ?? 0);
  const salePrice = Number(product?.salePrice ?? product?.pricing?.salePrice ?? 0);
  const hasSale =
    Boolean(salePrice) &&
    salePrice > 0 &&
    salePrice < regularPrice &&
    product?.isOnSale !== false;
  const basePrice = hasSale ? salePrice : regularPrice;
  const countdownEndDate = product?.saleSchedule?.endDate || product?.pricing?.saleSchedule?.endDate || null;
  const scheduleEnabled = Boolean(product?.saleSchedule?.enabled || product?.pricing?.saleSchedule?.enabled);
  const salePct = hasSale && regularPrice > 0 ? Math.max(1, Math.round(((regularPrice - basePrice) / regularPrice) * 100)) : 0;
  const images = (
    Array.isArray(product?.images)
      ? product.images
      : product?.image
        ? [product.image]
        : Array.isArray(product?.media?.images)
          ? product.media.images
          : []
  )
    .map((im) => (typeof im === "string" ? { url: im } : { url: im?.url || "" }))
    .filter((im) => im.url);

  const productVideoUrl =
    String(product?.videoUrl || product?.media?.videoUrl || "").trim();
  const productVideoType = (() => {
    const declared = String(product?.videoType || product?.media?.videoType || "").toLowerCase();
    if (declared === "youtube" || declared === "mp4") return declared;
    if (!productVideoUrl) return "";
    if (/youtu\.?be/i.test(productVideoUrl)) return "youtube";
    if (/\.(mp4|webm|mov)(\?.*)?$/i.test(productVideoUrl)) return "mp4";
    return "";
  })();
  const hasVideo = Boolean(productVideoUrl && productVideoType);
  const productVideos = useMemo(() => {
    const rows = Array.isArray(product?.media?.videos) ? product.media.videos : [];
    const cleaned = rows
      .map((video) => ({
        url: String(video?.url || "").trim(),
        originalUrl: String(video?.originalUrl || "").trim(),
        thumbnail: String(video?.thumbnail || "").trim(),
        title: String(video?.title || "").trim(),
        isPrimary: Boolean(video?.isPrimary),
      }))
      .filter((video) => video.url);
    cleaned.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
    return cleaned;
  }, [product?.media?.videos]);
  const galleryItems = useMemo(() => {
    const items = [];
    images.forEach((img) => {
      items.push({
        type: "image",
        url: img.url,
        thumbnail: img.url,
        altText: img.altText || "",
      });
    });

    const legacyEmbedUrl =
      String(product?.video?.url || product?.videoUrl || product?.media?.find?.((m) => m?.type === "video")?.url || "").trim() ||
      productVideoUrl;
    const embedHasVideo = Boolean(
      legacyEmbedUrl &&
        (hasVideo ||
          /youtu\.?be/i.test(legacyEmbedUrl) ||
          /\.(mp4|webm|mov)(\?.*)?$/i.test(legacyEmbedUrl))
    );

    let pushedEmbedUrl = "";
    if (embedHasVideo && legacyEmbedUrl) {
      pushedEmbedUrl = legacyEmbedUrl;
      const yt =
        productVideoType === "youtube" || /youtu\.?be/i.test(legacyEmbedUrl)
          ? (legacyEmbedUrl.match(
              /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i
            ) || [])[1] || ""
          : "";
      if (yt) {
        items.push({
          type: "youtube",
          url: legacyEmbedUrl,
          thumbnail: `https://img.youtube.com/vi/${yt}/0.jpg`,
          youTubeId: yt,
        });
      } else {
        items.push({
          type: "video",
          url: legacyEmbedUrl,
          thumbnail: images[0]?.url || "",
        });
      }
    }

    productVideos.forEach((video) => {
      if (pushedEmbedUrl && video.url === pushedEmbedUrl) return;
      items.push({
        type: "uploaded",
        url: video.url,
        originalUrl: video.originalUrl || "",
        thumbnail: video.thumbnail || images[0]?.url || "",
      });
    });

    return items;
  }, [images, product, productVideoUrl, productVideoType, hasVideo, productVideos]);

  useEffect(() => {
    setSelectedIndex((i) => {
      if (!galleryItems.length) return 0;
      return Math.min(Math.max(0, i), galleryItems.length - 1);
    });
  }, [galleryItems.length]);

  const selectedItem = galleryItems[selectedIndex] ?? galleryItems[0] ?? null;

  const simpleVariations = Array.isArray(product?.simpleVariations) ? product.simpleVariations : [];
  const variationCombinations = Array.isArray(product?.variationCombinations) ? product.variationCombinations : [];
  const enabledVariationAxes = simpleVariations.filter((v) => v.enabled && v.tags?.length > 0);
  const hasVariationCombinations = variationCombinations.length > 0;
  /** Storefront uses combination rows for stock when options + combo matrix exist; otherwise catalog/base quantity. */
  const usesCombinationStock = enabledVariationAxes.length > 0 && hasVariationCombinations;
  const baseStock = Number(product?.inventory?.quantity) || Number(product?.stock) || 0;
  const displayPrice = Number.isFinite(Number(matchedCombo?.price))
    ? Number(matchedCombo?.price)
    : Number(product?.price || basePrice || 0);
  const availableStock = usesCombinationStock
    ? matchedCombo != null && Number.isFinite(Number(matchedCombo.stock))
      ? Number(matchedCombo.stock)
      : null
    : baseStock;
  const quantityForDisplay = usesCombinationStock ? availableStock : baseStock;

  /** Meta Pixel ViewContent — product identity + current display price. */
  useEffect(() => {
    if (!product) return;
    const contentId = resolveProductContentId(product);
    if (!contentId) return;
    trackViewContent({
      contentIds: [contentId],
      value: displayPrice,
    });
  }, [
    product?._id,
    product?.id,
    product?.articleNo,
    product?.sku,
    displayPrice,
  ]);

  const variationState = useMemo(() => {
    const tracksStock =
      product?.inventory?.trackInventory !== false && product?.trackInventory !== false;
    const backorderOk = product?.inventory?.allowBackorder !== false;
    const productStock = Number(product?.inventory?.quantity ?? product?.stock ?? 0);

    const hasVariations =
      product?.simpleVariations?.some((v) => v.enabled && v.tags?.length > 0) ||
      (Array.isArray(product?.variationTypes) && product.variationTypes.length > 0);

    const enabledVars = (product?.simpleVariations || []).filter((v) => v.enabled && v.tags?.length > 0);

    const allSelected = hasVariations ? enabledVars.every((v) => selectedOptions?.[v.name]) : true;

    const matched =
      hasVariations && allSelected
        ? matchedCombo ??
          (product?.variationCombinations || []).find((combo) =>
            (combo.options || []).every((opt) => selectedOptions?.[opt.name] === opt.value)
          )
        : null;

    let stockStatus = "in_stock";
    let stockText = "In Stock";
    let stockColor = "#16a34a";
    let btnLabel = "Add to Cart";
    let btnDisabled = false;
    let btnBg = "#111111";

    const markOutOfStock = () => {
      if (backorderOk) {
        stockStatus = "backorder";
        stockText = "Available on backorder";
        stockColor = "#b45309";
        btnLabel = "Add to Cart";
        btnDisabled = false;
        btnBg = "#111111";
        return;
      }
      stockStatus = "out";
      stockText = "Out of Stock";
      stockColor = "#dc2626";
      btnLabel = "Out of Stock";
      btnDisabled = true;
      btnBg = "#9CA3AF";
    };

    if (hasVariations && !allSelected) {
      stockText = "In Stock";
      stockColor = "#16a34a";
      btnLabel = "Add to Cart";
      btnDisabled = false;
      btnBg = "#111111";
    } else if (matched) {
      if (Number(matched.stock) <= 0) {
        markOutOfStock();
      }
    } else if (hasVariations && allSelected && (product?.variationCombinations || []).length > 0) {
      markOutOfStock();
    } else if (hasVariations && allSelected) {
      if (product?.inStock === false || (tracksStock && productStock <= 0)) {
        markOutOfStock();
      }
    } else if (!hasVariations) {
      if (product?.inStock === false || (tracksStock && productStock <= 0)) {
        markOutOfStock();
      }
    }

    return {
      hasVariations,
      allSelected,
      matched,
      stockStatus,
      stockText,
      stockColor,
      btnLabel,
      btnDisabled,
      btnBg,
      canAddToCart: !btnDisabled,
      inStock: stockStatus === "in_stock" || stockStatus === "backorder",
    };
  }, [product, selectedOptions, matchedCombo]);

  const {
    hasVariations: hasProductVariations,
    allSelected: allVariationsSelected,
    matched: matchedVariation,
    stockStatus,
    stockText,
    stockColor,
    btnLabel,
    btnDisabled,
    btnBg,
    canAddToCart,
    inStock,
  } = variationState;

  const addOnTotal = selectedAddOns.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
  const finalUnitPrice = displayPrice + addOnTotal;

  function addToCart() {
    if (!product) return;
    if (!canAddToCart) {
      if (hasProductVariations && !allVariationsSelected) {
        toast.error("Please select all options first.");
      } else {
        toast.error("This product is currently out of stock.");
      }
      return;
    }
    const enabledVars = (product.simpleVariations || []).filter((v) => v.enabled && v.tags?.length > 0);
    if (hasProductVariations && !allVariationsSelected) {
      const missing = enabledVars.filter((v) => !selectedOptions[v.name]).map((v) => v.name);
      toast.error(`Please select: ${missing.join(", ")}`);
      return;
    }
    if (hasProductVariations && variationCombinations.length > 0 && !matchedVariation) {
      toast.error("Please select all options first.");
      return;
    }

    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: selectedItem?.type === "image" ? selectedItem.url : images[0]?.url || "",
      unitPrice: finalUnitPrice,
      price: finalUnitPrice,
      quantity: qty,
      articleNo: product.articleNo || "",
      sku: product.sku || "",
      variationLabel: hasProductVariations
        ? Object.entries(selectedOptions)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ")
        : "",
      selectedOptions: hasProductVariations
        ? Object.entries(selectedOptions).map(([name, value]) => ({ name, value }))
        : null,
      matchedCombination: matchedCombo || null,
      simpleVariations: product.simpleVariations || [],
      variationCombinations: product.variationCombinations || [],
      codEnabled: product.codEnabled !== false,
      advancePercentRequired: Math.min(
        100,
        Math.max(0, Number(product.advancePercentRequired) || 0)
      ),
    });
  }
  function handleAddToCart() {
    addToCart();
  }

  function handleBuyNow() {
    if (!canAddToCart) return;
    addToCart();
    router.push("/checkout");
  }

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-12"><div className="h-80 animate-pulse rounded bg-[#F8F8F8]" /></div>;
  }

  if (!product) {
    return <div className="mx-auto max-w-7xl px-4 py-12 text-sm text-[#888888]">Product not found.</div>;
  }

  const productId = product._id ?? product.id;
  const primaryImageUrl = images[0]?.url || "";

  function toggleWishlist() {
    if (productId == null) return;
    const wid = String(productId);
    const wishlist = getWishlist();
    const exists = wishlist.some((item) => String(item.id) === wid);
    if (exists) {
      const updated = wishlist.filter((item) => String(item.id) !== wid);
      saveWishlist(updated);
      setIsWishlisted(false);
      toast.success("Removed from wishlist");
    } else {
      const updated = [
        ...wishlist,
        {
          id: wid,
          name: product.name,
          slug: product.slug,
          price: Number(displayPrice) || 0,
          image: primaryImageUrl,
        },
      ];
      saveWishlist(updated);
      setIsWishlisted(true);
      toast.success("Added to wishlist! ♡");
    }
  }

  function toggleCompare() {
    if (productId == null) return;
    const wid = String(productId);
    const compare = getCompare();
    const exists = compare.some((item) => String(item.id) === wid);
    if (exists) {
      const updated = compare.filter((item) => String(item.id) !== wid);
      saveCompare(updated);
      setIsCompared(false);
      toast.success("Removed from compare");
    } else {
      if (compare.length >= 4) {
        toast.error("You can compare up to 4 products only");
        return;
      }
      const updated = [
        ...compare,
        {
          id: wid,
          name: product.name,
          slug: product.slug,
          price: Number(displayPrice) || 0,
          image: primaryImageUrl,
          inStock: Boolean(inStock),
          specifications: Array.isArray(product.specifications) ? product.specifications : [],
        },
      ];
      saveCompare(updated);
      setIsCompared(true);
      toast.success("Added to compare!");
    }
  }

  const descriptionHtml = sanitizeClientHtml(
    product.descriptionHtml || product.longDescription || product.description
  );
  const descriptionPlain = toPlain(product.shortDescription);
  const shortDesc =
    truncatePlain(toPlain(product?.shortDescription), 180) ||
    "Quality product with refined finish and modern design.";

  const freeThreshold = deliveryInfo?.freeShippingThreshold || 2999;
  const majorCityDays = deliveryInfo?.majorCities?.days || "2-3";
  const otherAreaDays = deliveryInfo?.otherAreas?.days || "4-7";
  const freeShippingText =
    deliveryInfo?.freeShippingText ||
    `Free delivery on orders over Rs. ${freeThreshold.toLocaleString()}`;

  return (
    <>
    <div className="bg-[#FFFFFF] pb-12">
      <style>{`
        @keyframes productViewerPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
      <div className="bg-[#F8F8F8] py-3 border-b border-[#E5E5E5]">
        <div className="mx-auto max-w-7xl px-4 text-sm text-[#888888]">
          <Link href="/">Home</Link> / <span>{product.name}</span>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-7xl px-4">
        <div
          className="product-detail-grid grid items-start gap-10 lg:grid-cols-2 lg:gap-12"
          style={{ alignItems: "flex-start" }}
        >
          <div className="product-images-col min-w-0">
            <div
              className="product-main-viewer overflow-hidden rounded-lg border border-[#E5E5E5] bg-[#F8F8F8]"
              style={{ width: "100%", aspectRatio: "1 / 1" }}
            >
              {!selectedItem ? (
                <div className="grid h-full place-items-center text-sm text-[#707070]">No media available</div>
              ) : selectedItem.type === "youtube" && selectedItem.youTubeId ? (
                <div className="relative h-full w-full overflow-hidden rounded bg-black">
                  <iframe
                    src={`https://www.youtube.com/embed/${selectedItem.youTubeId}?rel=0`}
                    title={`${product?.name || "Product"} video`}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full"
                  />
                </div>
              ) : selectedItem.type === "uploaded" ? (
                <video
                  key={selectedItem.url}
                  controls
                  preload="metadata"
                  poster={selectedItem.thumbnail || ""}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    background: "#000",
                  }}
                >
                  <source src={selectedItem.url} type="video/webm" />
                  {selectedItem.originalUrl ? <source src={selectedItem.originalUrl} type="video/mp4" /> : null}
                  Your browser does not support video playback.
                </video>
              ) : selectedItem.type === "video" ? (
                <video
                  key={selectedItem.url}
                  src={selectedItem.url}
                  controls
                  preload="metadata"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    background: "#000",
                  }}
                />
              ) : (
                <WatermarkedImage
                  src={selectedItem.url}
                  alt={selectedItem.altText || product.name}
                  watermark={productImageWatermark}
                  className="h-full w-full"
                  imgStyle={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center",
                    transform: "scale(1.06)",
                  }}
                />
              )}
            </div>
            <div className="product-thumbs-rail">
              {galleryItems.map((item, index) => (
                <button
                  key={`${item.type}-${item.url}-${index}`}
                  type="button"
                  onClick={() => setSelectedIndex(index)}
                  aria-label={item.type === "image" ? `Image ${index + 1}` : "Product video"}
                  className="product-thumb-btn transition"
                  style={{
                    width: 72,
                    height: 72,
                    flexShrink: 0,
                    borderRadius: 4,
                    overflow: "hidden",
                    border: "2px solid",
                    borderColor: selectedIndex === index ? "#111111" : "#E5E5E5",
                    cursor: "pointer",
                    position: "relative",
                    background: "#F8F8F8",
                    padding: 0,
                  }}
                >
                  {item.type === "image" ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={item.url}
                      alt={item.altText || `${product.name} ${index + 1}`}
                      loading="lazy"
                      decoding="async"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    <>
                      {item.thumbnail ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={item.thumbnail}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            background: "#111111",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        />
                      )}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "rgba(0,0,0,0.4)",
                        }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden>
                          <polygon points="5,3 19,12 5,21" />
                        </svg>
                      </div>
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="product-info-col min-w-0 space-y-4">
            {reviewCount > 0 ? (
              <p style={{ fontSize: 13, color: "#888888", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                <StarDisplay rating={reviewAverage ?? 0} size={15} />
                <span>
                  ({reviewCount} customer {reviewCount === 1 ? "review" : "reviews"})
                </span>
              </p>
            ) : (
              <p style={{ fontSize: 13, color: "#888888" }}>No reviews yet. Be the first to share yours.</p>
            )}
            <h1
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(18px, 2.5vw, 22px)",
                fontWeight: 600,
                color: "#1a1a1a",
                lineHeight: 1.3,
                letterSpacing: "-0.01em",
                margin: "0 0 8px",
              }}
            >
              {product.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3" style={{ margin: "8px 0" }}>
              {hasSale ? (
                <>
                  <span
                    className="price"
                    style={{
                      fontFamily: "Arial, Helvetica, sans-serif",
                      fontSize: 26,
                      fontWeight: 700,
                      color: "#111111",
                      lineHeight: 1,
                    }}
                  >
                    {formatPrice(displayPrice)}
                  </span>
                  <span
                    className="price"
                    style={{
                      fontFamily: "Arial, Helvetica, sans-serif",
                      fontSize: 18,
                      fontWeight: 700,
                      color: "#888888",
                      textDecoration: "line-through",
                      lineHeight: 1,
                    }}
                  >
                    {formatPrice(regularPrice)}
                  </span>
                </>
              ) : (
                <span
                  className="price"
                  style={{
                    fontFamily: "Arial, Helvetica, sans-serif",
                    fontSize: 26,
                    fontWeight: 700,
                    color: "#111111",
                    lineHeight: 1,
                  }}
                >
                  {formatPrice(displayPrice)}
                </span>
              )}
              {hasSale ? <span className="rounded bg-red-500 px-2 py-1 text-xs font-semibold text-white">-{salePct}%</span> : null}
            </div>
            <p
              style={{
                fontSize: 14,
                color: "#555555",
                lineHeight: 1.7,
                margin: "12px 0",
              }}
            >
              {shortDesc}
            </p>

            {Array.isArray(product.categories) && product.categories.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "0 0 16px" }}>
                {product.categories.map((cat) => {
                  const slug = cat?.slug;
                  if (!slug) return null;
                  return (
                    <Link
                      key={cat.id || slug}
                      href={`/categories/${slug}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "4px 10px",
                        borderRadius: 999,
                        border: "1px solid #E5E5E5",
                        background: "#F8F8F8",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#374151",
                        textDecoration: "none",
                      }}
                    >
                      {cat.name || slug}
                    </Link>
                  );
                })}
              </div>
            ) : null}

            {scheduleEnabled && countdownEndDate ? (
              <div className="rounded border border-[#E5E5E5] p-3">
                <p className="mb-2 text-sm font-semibold text-red-600">Hurry Up! Deals End In:</p>
                <CountdownTimer endDate={countdownEndDate} />
              </div>
            ) : null}

            <p
              style={{
                fontSize: 13,
                color: "#888888",
                margin: "8px 0",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              Availability:
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  color: stockColor,
                  fontWeight: 600,
                }}
              >
                {stockStatus !== "select" ? (
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: stockColor,
                      display: "inline-block",
                    }}
                  />
                ) : null}
                {stockText}
              </span>
            </p>


            <ProductVariations
              simpleVariations={simpleVariations}
              variationCombinations={variationCombinations}
              basePrice={basePrice}
              onVariationChange={(selected, combo) => {
                setSelectedOptions(selected);
                setMatchedCombo(combo);
              }}
            />

            {(product?.addOns || []).length ? (
              <div>
                <p className="mb-2 text-sm font-semibold text-[#111111]">Add-ons:</p>
                <div className="space-y-2">
                  {(product.addOns || []).map((addon, idx) => {
                    const checked = selectedAddOns.some((a) => a.name === addon.name);
                    return (
                      <label key={`${addon.name}-${idx}`} className="flex items-center justify-between rounded border border-[#E5E5E5] bg-[#FFFFFF] p-3 text-sm">
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setSelectedAddOns((prev) =>
                                e.target.checked ? [...prev, addon] : prev.filter((a) => a.name !== addon.name)
                              )
                            }
                          />
                          {addon.name}
                        </span>
                        <span className="font-medium text-[var(--primary)]">
                          +<span className="price">{formatPrice(addon.price)}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                <p className="mt-2 text-sm font-semibold text-[#111111]">
                  Total: <span className="price">{formatPrice(finalUnitPrice)}</span>
                </p>
              </div>
            ) : null}

            {Number(product?.advancePercentRequired) > 0 ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Pay at least <strong>{Math.round(Number(product.advancePercentRequired))}%</strong> advance
                required for this product (remaining on delivery with COD).
              </p>
            ) : null}

            {product?.customSizing?.enabled ? (
              <details className="rounded border border-[#E5E5E5] p-3">
                <summary className="cursor-pointer text-sm font-semibold text-[#111111]">{product.customSizing.title || "Custom Measurements"}</summary>
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-[#707070]">{product.customSizing.description}</p>
                  {(product.customSizing.fields || []).map((f, i) => (
                    <div key={`${f.fieldName}-${i}`}>
                      <label className="mb-1 block text-xs font-medium text-[#B0B0B0]">{f.label}</label>
                      <input className="w-full rounded border border-[#E5E5E5] px-3 py-2 text-sm" placeholder={f.placeholder || "Enter value"} />
                    </div>
                  ))}
                </div>
              </details>
            ) : null}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                margin: "12px 0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  border: "1px solid #E5E5E5",
                  borderRadius: 6,
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  style={{
                    width: 36,
                    height: 44,
                    background: "#F8F8F8",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 18,
                    color: "#111111",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  -
                </button>
                <span
                  style={{
                    width: 44,
                    height: 44,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#111111",
                    borderLeft: "1px solid #E5E5E5",
                    borderRight: "1px solid #E5E5E5",
                  }}
                >
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((q) => q + 1)}
                  style={{
                    width: 36,
                    height: 44,
                    background: "#F8F8F8",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 18,
                    color: "#111111",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={btnDisabled}
                style={{
                  flex: 1,
                  height: 52,
                  background: canAddToCart
                    ? "linear-gradient(135deg, #111111 0%, #333333 100%)"
                    : "#D1D5DB",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: canAddToCart ? "pointer" : "not-allowed",
                  transition: "all 0.25s ease",
                  boxShadow: canAddToCart ? "0 4px 15px rgba(0,0,0,0.2)" : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
                onMouseEnter={(e) => {
                  if (canAddToCart) {
                    e.currentTarget.style.background = "linear-gradient(135deg, #000000 0%, #222222 100%)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.3)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (canAddToCart) {
                    e.currentTarget.style.background = "linear-gradient(135deg, #111111 0%, #333333 100%)";
                    e.currentTarget.style.boxShadow = "0 4px 15px rgba(0,0,0,0.2)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }
                }}
              >
                {canAddToCart ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  </svg>
                ) : null}
                {btnLabel}
              </button>
            </div>

            <button
              type="button"
              onClick={handleBuyNow}
              disabled={btnDisabled}
              style={{
                width: "100%",
                height: 52,
                marginTop: 10,
                background: canAddToCart ? "#111111" : "#D1D5DB",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.06em",
                cursor: canAddToCart ? "pointer" : "not-allowed",
                transition: "all 0.25s ease",
                boxShadow: canAddToCart ? "0 4px 15px rgba(0,0,0,0.15)" : "none",
              }}
              onMouseEnter={(e) => {
                if (canAddToCart) e.currentTarget.style.background = "#000000";
              }}
              onMouseLeave={(e) => {
                if (canAddToCart) e.currentTarget.style.background = "#111111";
              }}
            >
              Buy Now
            </button>

            <div
              style={{
                marginTop: 16,
                padding: "14px 16px",
                background: "#F9FAFB",
                border: "1px solid #E5E7EB",
                borderRadius: 8,
              }}
            >
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 4 }}>
                  🚚 Estimated Delivery
                </p>
                <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>
                  Major cities: {majorCityDays} days | Other areas: {otherAreaDays} days
                </p>
                <p style={{ fontSize: 13, color: "#16A34A", fontWeight: 600, margin: "4px 0 0" }}>
                  ✓ {freeShippingText}
                </p>
              </div>
            </div>

            {(!productBadges || productBadges?.discreteShipping?.enabled !== false) && (
              <div
                style={{
                  background: "#F8F8F8",
                  border: "1px solid #E5E5E5",
                  borderRadius: 6,
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  marginTop: 12,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555555" strokeWidth="1.5" aria-hidden>
                  <rect x="1" y="3" width="15" height="13" />
                  <path d="M16 8h4l3 3v5h-7V8z" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
                <div>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#111111",
                      margin: "0 0 2px",
                    }}
                  >
                    {productBadges?.discreteShipping?.title || "Fast Nationwide Delivery"}
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: "#888888",
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    {productBadges?.discreteShipping?.description ||
                      "All orders are shipped in plain, unmarked packaging to protect your privacy."}
                  </p>
                </div>
              </div>
            )}

            {(!productBadges || productBadges.enabled !== false) &&
              (() => {
                const source =
                  productBadges?.trustBadges?.length > 0
                    ? normalizeProductTrustBadges(productBadges.trustBadges)
                    : DEFAULT_PRODUCT_PAGE_TRUST_BADGES;
                const visible = source.filter((b) => b && b.enabled && String(b.text || "").trim());
                if (visible.length === 0) return null;
                return (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: 6,
                      padding: "12px 0",
                      borderTop: "1px solid #F0F0F0",
                      borderBottom: "1px solid #F0F0F0",
                      margin: "8px 0",
                    }}
                  >
                    {visible.map((badge, i) => (
                      <div
                        key={`${badge.text}-${i}`}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          textAlign: "center",
                          padding: "6px 2px",
                          gap: 4,
                        }}
                      >
                        <span style={{ fontSize: 18, lineHeight: 1 }}>{badge.icon || "✓"}</span>
                        <p
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: "#111111",
                            margin: 0,
                            textTransform: "uppercase",
                            letterSpacing: "0.03em",
                            lineHeight: 1.2,
                          }}
                        >
                          {badge.text}
                        </p>
                        {badge.subtext ? (
                          <p style={{ fontSize: 8, color: "#888888", margin: 0, lineHeight: 1.2 }}>{badge.subtext}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                );
              })()}

            {(productBadges?.asianImportsBadge?.enabled === true && String(productBadges?.asianImportsBadge?.title || '').trim()) && (
              <div
                style={{
                  background: "#F8F8F8",
                  border: "1px solid #E5E5E5",
                  borderRadius: 6,
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  marginTop: 8,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555555" strokeWidth="1.5" aria-hidden>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <div>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#111111",
                      margin: "0 0 2px",
                    }}
                  >
                    {productBadges?.asianImportsBadge?.title}
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: "#888888",
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    {productBadges?.asianImportsBadge?.description || ''}
                  </p>
                </div>
              </div>
            )}

            {productBadges?.qualityBadges?.filter((b) => b && b.enabled && String(b.text || "").trim()).length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 0,
                  padding: "12px 0",
                  borderTop: "1px solid #F0F0F0",
                }}
              >
                {productBadges.qualityBadges
                  .filter((b) => b && b.enabled && String(b.text || "").trim())
                  .map((badge, i, arr) => (
                    <span
                      key={`${badge.text}-${i}`}
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#555555",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {badge.text}
                      {i < arr.length - 1 && (
                        <span
                          style={{
                            margin: "0 8px",
                            color: "#CCCCCC",
                          }}
                        >
                          |
                        </span>
                      )}
                    </span>
                  ))}
              </div>
            )}

            <div className="mt-6">
              <VehicleCompatibilitySection product={product} />
            </div>

            <div className="product-accordions mt-6 border-t border-[#E5E5E5] pt-2 lg:mt-6">
              <AccordionSection
                id="description"
                title="Description"
                icon="Details"
                isOpen={openSection === "description"}
                onToggle={(sid) => setOpenSection(openSection === sid ? null : sid)}
              >
                {descriptionHtml ? (
                  <div
                    className="product-description prose prose-neutral max-w-none"
                    dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                  />
                ) : descriptionPlain ? (
                  <p style={{ fontSize: 14, color: "#555555", lineHeight: 1.7, margin: 0 }}>{descriptionPlain}</p>
                ) : (
                  <p style={{ fontSize: 14, color: "#555555", lineHeight: 1.7, margin: 0 }}>No description available.</p>
                )}
              </AccordionSection>

              {product.specifications?.length > 0 ? (
                <AccordionSection
                  id="specifications"
                  title="Features & Specifications"
                  icon="Specs"
                  isOpen={openSection === "specifications"}
                  onToggle={(sid) => setOpenSection(openSection === sid ? null : sid)}
                >
                  <div style={{ padding: "4px 0" }}>
                    {product.specifications.map((spec, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "10px 0",
                          borderBottom: i < product.specifications.length - 1 ? "1px solid #F5F5F5" : "none",
                        }}
                      >
                        <span style={{ fontSize: 13, color: "#111111", fontWeight: 600, width: "40%", minWidth: 120, flexShrink: 0, textAlign: "left" }}>{spec.label}</span>
                        <span style={{ fontSize: 13, color: "#111111", fontWeight: 600, flex: 1, textAlign: "left" }}>{spec.value}</span>
                      </div>
                    ))}
                  </div>
                </AccordionSection>
              ) : null}

              <AccordionSection
                id="delivery"
                title="Delivery & Returns"
                icon="Delivery"
                isOpen={openSection === "delivery"}
                onToggle={(sid) => setOpenSection(openSection === sid ? null : sid)}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: "#111111", margin: "0 0 10px" }}>
                      🚚 Pakistan Nationwide Delivery
                    </h4>
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: 18,
                        fontSize: 13,
                        color: "#555555",
                        lineHeight: 1.7,
                      }}
                    >
                      <li>Major cities (Karachi, Lahore, Islamabad, Rawalpindi): 2-3 business days</li>
                      <li>Other cities: 3-5 business days</li>
                      <li>Remote areas: 5-7 business days</li>
                      <li>Free delivery on orders over Rs. 2,999</li>
                      <li>Cash on Delivery available nationwide</li>
                    </ul>
                  </div>

                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: "#111111", margin: "0 0 10px" }}>
                      🔄 Easy Returns Policy
                    </h4>
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: 18,
                        fontSize: 13,
                        color: "#555555",
                        lineHeight: 1.7,
                      }}
                    >
                      <li>7-day return policy from delivery date</li>
                      <li>Item must be unused and in original packaging</li>
                      <li>Contact us on WhatsApp to initiate return</li>
                      <li>Return shipping arranged by us for defective items</li>
                      <li>Refund processed within 3-5 business days</li>
                    </ul>
                  </div>
                </div>
              </AccordionSection>

              <AccordionSection
                id="reviews"
                title="Customer Reviews"
                icon="Reviews"
                isOpen={openSection === "reviews"}
                onToggle={(sid) => setOpenSection(openSection === sid ? null : sid)}
                badge={reviewCount > 0 ? `${reviewCount} reviews` : null}
              >
                <ProductReviews
                  embedded
                  productId={product._id || product.id}
                  productSlug={product.slug}
                  onReviewCountChange={(total, avg) => {
                    setReviewCount(total);
                    if (avg != null && Number.isFinite(Number(avg))) setReviewAverage(Number(avg));
                  }}
                />
              </AccordionSection>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 0",
                borderTop: "1px solid #F0F0F0",
              }}
            >
              <button
                type="button"
                onClick={toggleWishlist}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: "none",
                  border: "1px solid",
                  borderColor: isWishlisted ? "#D72323" : "#E5E5E5",
                  borderRadius: 6,
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  color: isWishlisted ? "#D72323" : "#555555",
                }}
              >
                {isWishlisted ? "♥" : "♡"} Wishlist
              </button>

              <button
                type="button"
                onClick={toggleCompare}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: "none",
                  border: "1px solid",
                  borderColor: isCompared ? "#009688" : "#E5E5E5",
                  borderRadius: 6,
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  color: isCompared ? "#009688" : "#555555",
                }}
              >
                ⇄ Compare
              </button>

              <button
                type="button"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: product.name,
                      url: window.location.href,
                    });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success("Link copied!");
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: "none",
                  border: "1px solid #E5E5E5",
                  borderRadius: 6,
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#555555",
                }}
              >
                ↗ Share
              </button>
            </div>
          </div>
        </div>
      </div>

      {related.length ? (
        <section className="mx-auto mt-12 max-w-7xl px-4">
          <h2 className="mb-6 text-center text-2xl font-bold">You May Also Like</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      ) : (
        <section className="mx-auto mt-12 max-w-7xl px-4">
          <h2 className="mb-6 text-center text-2xl font-bold">You May Also Like</h2>
          <p className="text-center text-sm text-[#707070]">No related products available.</p>
        </section>
      )}

    </div>

    </>
  );
}
