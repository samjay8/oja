import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { getDb } from "@/db";
import { eq } from "drizzle-orm";
import { conversations } from "@/db/schema";
import { confirmPayPalPayment, logEvent, orderByRef, UserFacingError, vendorById } from "@/lib/commerce";
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
    // Message only: PayPal error details carry the buyer's address.
    console.error("[pay/return]", ref, e instanceof Error ? e.message : e);
    status = e instanceof UserFacingError ? "mismatch" : "error";
    if (status === "error") {
      // The buyer is told the seller will check, so the seller needs to see it.
      await logEvent(db, { vendorId: order.vendorId, orderId: order.id, conversationId: order.conversationId, type: "payment.capture_failed",
        data: { message: e instanceof Error ? e.message.slice(0, 300) : "unknown" } });
      await db.update(conversations).set({ needsHuman: true }).where(eq(conversations.id, order.conversationId));
    }
  }
  redirect(`/shop/${vendor.slug}?order=${ref}&payment=${status}`);
}
