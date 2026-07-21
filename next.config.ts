import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.kiwi.com", pathname: "/airlines/64/**" },
      { protocol: "https", hostname: "flagcdn.com", pathname: "/w40/**" },
    ],
  },
};

export default nextConfig;
