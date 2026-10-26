import type { NextConfig } from "next";

const BACKEND_URL = (process.env.BACKEND_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

const config: NextConfig = {
  // Django routes end in "/"; Next would otherwise strip it and Django's catch-all would 404.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: "/api/:path*/", destination: `${BACKEND_URL}/api/:path*/` },
      { source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*/` },
      { source: "/admin/:path*", destination: `${BACKEND_URL}/admin/:path*` },
      { source: "/static/:path*", destination: `${BACKEND_URL}/static/:path*` },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "img.spoonacular.com" },
    ],
  },
};

export default config;
