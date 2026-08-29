import type { NextConfig } from "next";

// Applied to every response. The Content-Security-Policy is emitted separately
// by clerkMiddleware (src/proxy.ts) so its host list stays in sync with Clerk.
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
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
  allowedDevOrigins: ["172.22.48.1"],
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
