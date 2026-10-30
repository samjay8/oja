import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native/wasm and CommonJS-heavy server deps stay out of the bundle.
  serverExternalPackages: ["@electric-sql/pglite", "@paypal/agent-toolkit", "postgres"],
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
