/** @type {import('next').NextConfig} */
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
      {
        source: "/pages/:slug",
        destination: "/:slug",
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
  poweredByHeader: false,
  compress: true,
  reactStrictMode: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  images: {
    // TODO: consolidate to one Cloudinary account (currently products≈djmqim946, logo≈dquier8fv)
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/djmqim946/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/dquier8fv/**",
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
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
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
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=30, stale-while-revalidate=60",
          },
        ],
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
};

export default nextConfig;
