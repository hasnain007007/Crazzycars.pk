/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Docker/Coolify (output: .next/standalone)
  output: "standalone",
  poweredByHeader: false,
  compress: true,
  reactStrictMode: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
  },
  async headers() {
    const security = [
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
    ];
    // Do not enable credentialed CORS from the storefront. Admin cookies are
    // host-only; allowing crazzycars.pk JS to call admin APIs with credentials
    // would create a CSRF surface. Storefront never needs cross-origin admin APIs.
    return security;
  },
  async rewrites() {
    return [{ source: "/media/:path*", destination: "/api/media/:path*" }];
  },
};

export default nextConfig;
