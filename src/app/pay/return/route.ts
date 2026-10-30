import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { getDb } from "@/db";
import { confirmPayPalPayment, orderByRef, UserFacingError, vendorById } from "@/lib/commerce";
import { captureOrder } from "@/lib/paypal";

// PayPal sends the buyer back here after they approve. Capture, verify, back to chat.
export async function GET(req: NextRequest) {
  const ref = (req.nextUrl.searchParams.get("ref") ?? "").toUpperCase();
  const db = await getDb();
  const order = await orderByRef(db, ref);
  if (!order) return new Response("Order not found", { status: 404 });
  const vendor = (await vendorById(db, order.vendorId))!;
  // The token PayPal appends must be this order's PayPal id.
  const token = req.nextUrl.searchParams.get("token");
  if (token && token !== order.paypalOrderId) return new Response("Order mismatch", { status: 400 });

  let status = "paid";
  try {
    await confirmPayPalPayment(db, captureOrder, ref);
  } catch (e) {
    console.error("[pay/return]", e);
    status = e instanceof UserFacingError ? "mismatch" : "error";
  }
  redirect(`/shop/${vendor.slug}?order=${ref}&payment=${status}`);
}
