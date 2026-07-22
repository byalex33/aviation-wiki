import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ],
  },
};

export default nextConfig;
