import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native/wasm and CommonJS-heavy server deps stay out of the bundle.
  serverExternalPackages: ["@electric-sql/pglite", "@paypal/agent-toolkit", "postgres"],
  // Lets several dev servers or builds run side by side (NEXT_DIST_DIR=.next-x).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  cacheComponents: true,
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
