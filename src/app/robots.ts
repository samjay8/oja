import type { MetadataRoute } from "next";

const base = () => (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/", "/shop/"], disallow: ["/vendor/", "/api/", "/pay/"] },
    sitemap: `${base()}/sitemap.xml`,
  };
}
