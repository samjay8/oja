import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { getDb } from "@/db";
import { vendorBySlug, type Vendor } from "./commerce";

export async function baseUrl(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET is required in production");
  return s ?? "dev-only-secret";
}

export function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

function sessionToken(v: Vendor) {
  // Rotating the dashboard key invalidates existing sessions.
  return createHmac("sha256", secret()).update(`${v.id}:${v.dashboardKeyHash}`).digest("hex");
}

const cookieName = (slug: string) => `oja_vendor_${slug}`;

export function keyMatches(v: Vendor, key: string) {
  const a = Buffer.from(hashKey(key), "hex");
  const b = Buffer.from(v.dashboardKeyHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function signInVendor(v: Vendor) {
  (await cookies()).set(cookieName(v.slug), sessionToken(v), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 14,
  });
}

/** The signed-in vendor for this slug, or null. */
export async function currentVendor(slug: string): Promise<Vendor | null> {
  const db = await getDb();
  const v = await vendorBySlug(db, slug);
  if (!v) return null;
  const got = (await cookies()).get(cookieName(slug))?.value;
  if (!got) return null;
  const want = sessionToken(v);
  return got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want)) ? v : null;
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}
