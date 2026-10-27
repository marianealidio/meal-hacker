import type { NextConfig } from "next";
import { BACKEND_URL } from "./lib/backend";

const config: NextConfig = {
  // The e2e run builds into its own folder so it never clobbers a running dev server's .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Django routes end in "/"; Next would otherwise strip it and Django's catch-all would 404.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: "/api/:path*/", destination: `${BACKEND_URL}/api/:path*/` },
      { source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*/` },
      { source: "/admin/:path*/", destination: `${BACKEND_URL}/admin/:path*/` },
      { source: "/admin/:path*", destination: `${BACKEND_URL}/admin/:path*/` },
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
