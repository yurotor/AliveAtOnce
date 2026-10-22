import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Portraits are Wikimedia Commons thumbnails, re-encoded and resized by the image optimiser.
  images: {
    remotePatterns: [new URL("https://thumb.wikimedia.org/wikipedia/commons/**"), new URL("https://upload.wikimedia.org/wikipedia/commons/**")],
    minimumCacheTTL: 2678400, // 31 days
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
