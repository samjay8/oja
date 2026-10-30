import type { NextRequest } from "next/server";
import { getDb } from "@/db";
import { json, keyMatches, signInVendor } from "@/lib/app";
import { vendorBySlug } from "@/lib/commerce";
import { allow } from "@/lib/ratelimit";

export async function POST(req: NextRequest, ctx: RouteContext<"/api/vendor/[slug]/login">) {
  const { slug } = await ctx.params;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!allow(`login:${ip}`, 10, 10 * 60_000)) return json({ error: "Too many attempts. Try again in a few minutes." }, 429);
  const { key } = (await req.json().catch(() => ({}))) as { key?: string };
  const vendor = await vendorBySlug(await getDb(), slug);
  if (!vendor || typeof key !== "string" || !keyMatches(vendor, key)) return json({ error: "That key didn't work." }, 401);
  await signInVendor(vendor);
  return json({ ok: true });
}
