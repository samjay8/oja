import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { getDb } from "@/db";
import { orderByRef, vendorById } from "@/lib/commerce";

export async function GET(req: NextRequest) {
  const ref = (req.nextUrl.searchParams.get("ref") ?? "").toUpperCase();
  const db = await getDb();
  const order = await orderByRef(db, ref);
  if (!order) return new Response("Order not found", { status: 404 });
  const vendor = (await vendorById(db, order.vendorId))!;
  redirect(`/shop/${vendor.slug}?order=${ref}&payment=cancelled`);
}
