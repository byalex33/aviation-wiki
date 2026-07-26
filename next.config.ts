import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["172.22.48.1"],
  turbopack: {
    root: process.cwd(),
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
