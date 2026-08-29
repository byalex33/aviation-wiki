import type { NextConfig } from "next";

// Applied to every response. The Content-Security-Policy is emitted separately
// by clerkMiddleware (src/proxy.ts) so its host list stays in sync with Clerk.
const securityHeaders = [
  {
    // Two years, all subdomains. `preload` is intentionally omitted: submitting
    // to the browser preload list is effectively irreversible and would force
    // every current and future subdomain onto HTTPS with no fast rollback.
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  // If `next dev` rejects requests from another device on your LAN, add that
  // origin here locally — it is not needed for production and should not be
  // committed. https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com", pathname: "/**" },
      { protocol: "https", hostname: "airhex.com", pathname: "/images/airline-logos/tail/**" },
      { protocol: "https", hostname: "images.kiwi.com", pathname: "/airlines/64/**" },
      { protocol: "https", hostname: "flagcdn.com", pathname: "/w40/**" },
      { protocol: "https", hostname: "upload.wikimedia.org", pathname: "/**" },
      { protocol: "https", hostname: "cdn.jetphotos.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
