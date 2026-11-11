import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { vendors } from "@/db/schema";

const base = () => (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

/** Public pages only: the home page and every shop. Desks, APIs and payment returns stay out. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection(); // shops come and go; read the database per request, never at build
  const root = base();
  const db = await getDb();
  const shops = await db.select({ slug: vendors.slug }).from(vendors).orderBy(asc(vendors.createdAt));
  return [
    { url: `${root}/`, changeFrequency: "weekly", priority: 1 },
    ...shops.map((s) => ({
      url: `${root}/shop/${encodeURIComponent(s.slug)}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
