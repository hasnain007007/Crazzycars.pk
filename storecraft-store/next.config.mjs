/** @type {import('next').NextConfig} */
import { buildLegacyRedirects } from "./lib/legacyHandleMaps.mjs";

const nextConfig = {
  async redirects() {
    return [
      {
        source: "/posts",
        destination: "/blogs",
        permanent: true,
      },
      {
        source: "/posts/:slug",
        destination: "/blogs/:slug",
        permanent: true,
      },
      // Shopify-era CMS slugs that do not match new-site paths (must be before /pages/:slug)
      {
        source: "/pages/track-your-order",
        destination: "/track-order",
        permanent: true,
      },
      {
        source: "/pages/contact-1",
        destination: "/contact",
        permanent: true,
      },
      {
        source: "/pages/shipping-and-delivery-policy",
        destination: "/shipping-policy",
        permanent: true,
      },
      {
        source: "/pages/return-refund-policy",
        destination: "/returns-policy",
        permanent: true,
      },
      {
        source: "/pages/terms-of-service",
        destination: "/terms-conditions",
        permanent: true,
      },
      // Short Shopify / leftover handles → canonical paths (before /pages/:slug)
      ...buildLegacyRedirects(),
      {
        source: "/pages/:slug",
        destination: "/:slug",
        permanent: true,
      },
      // /products/:slug is handled in middleware (next.config redirects preserve
      // ?variant=&country=&currency=, which created GSC "alternate canonical" noise).
      // Shopify blog / cart / search leftovers
      {
        source: "/blogs/news",
        destination: "/blogs",
        permanent: true,
      },
      {
        source: "/blog/news",
        destination: "/blogs",
        permanent: true,
      },
      {
        source: "/cart",
        destination: "/shop",
        permanent: true,
      },
      {
        source: "/search",
        destination: "/shop",
        permanent: true,
      },
      {
        source: "/collection/:slug",
        destination: "/collections/:slug",
        permanent: true,
      },
      {
        source: "/tracking",
        destination: "/track-order",
        permanent: false,
      },
      {
        source: "/track",
        destination: "/track-order",
        permanent: false,
      },
    ];
  },
  // Required for Docker/Coolify (output: .next/standalone)
  output: "standalone",
  poweredByHeader: false,
  compress: true,
  reactStrictMode: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  images: {
    // Legacy Cloudinary + Shopify still appear in Mongo until rehost finishes.
    // New uploads use same-origin /media (raw <img>, not next/image optimizer).
    remotePatterns: [
      {
        protocol: "https",
        hostname: "crazzycars.pk",
        pathname: "/media/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        pathname: "/**",
      },
    ],
    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 60 * 60 * 24 * 7,
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 360, 400, 480],
  },
  experimental: {
    optimizeCss: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests",
          },
        ],
      },
      {
        source: "/api/settings",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      {
        source: "/api/banners",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      {
        source: "/api/products",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      {
        source: "/api/car-catalog",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=300, stale-while-revalidate=600",
          },
        ],
      },
      {
        source: "/api/categories/tree",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      {
        source: "/api/products/fitment",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      // Private / customer / write APIs — never shared-cache
      {
        source: "/api/customer/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
      {
        source: "/api/account/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
      {
        source: "/api/checkout/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
      {
        source: "/api/analytics/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
      {
        source: "/api/orders/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
      {
        source: "/api/payment/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
      {
        source: "/api/auth/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
      {
        source: "/api/coupons/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
      {
        source: "/api/revalidate",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
      {
        source: "/api/contact",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
      // Long-lived caching for static chunks is production-only: in dev it makes
      // browsers serve stale code after edits.
      ...(process.env.NODE_ENV === "production"
        ? [
            {
              source: "/_next/static/:path*",
              headers: [
                {
                  key: "Cache-Control",
                  value: "public, max-age=31536000, immutable",
                },
              ],
            },
          ]
        : []),
      {
        source: "/sitemap.xml",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=86400, stale-while-revalidate=3600",
          },
        ],
      },
      {
        source: "/robots.txt",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=86400",
          },
        ],
      },
    ];
  },
  async rewrites() {
    // Public CDN-style URLs → API route (reliable under Coolify standalone)
    return [{ source: "/media/:path*", destination: "/api/media/:path*" }];
  },
};

export default nextConfig;
