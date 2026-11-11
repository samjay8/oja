// Business rules shared by the agent tools, the web routes and the channel adapters.
// Prices, delivery costs and totals are computed here from the database, never taken
// from the model.

import { and, asc, desc, eq, gt, ilike, isNull, or } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import type { DB } from "@/db";
import {
  conversations, deliveryZones, events, messages, offers, orders, products, reviews, vendors,
  type Channel, type MessageRole, type MessageStatus, type OrderLine, type ShipTo,
} from "@/db/schema";
import { quoteDelivery, type DeliveryQuote } from "./delivery";
import { PAYPAL_CURRENCIES, type Currency } from "./money";
import { DEFAULT_PLAYBOOK, evaluateOffer, unitPriceFor, type OfferDecision, type Playbook } from "./pricing";

export type Vendor = typeof vendors.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;

export const OFFER_TTL_MS = 24 * 60 * 60 * 1000;

export function playbookFor(v: Vendor): Playbook {
  return { ...DEFAULT_PLAYBOOK, ...v.playbook };
}

export async function vendorBySlug(db: DB, slug: string) {
  return (await db.select().from(vendors).where(eq(vendors.slug, slug)).limit(1))[0] ?? null;
}

export async function vendorById(db: DB, id: string) {
  return (await db.select().from(vendors).where(eq(vendors.id, id)).limit(1))[0] ?? null;
}

export async function searchCatalog(db: DB, vendorId: string, query?: string) {
  const q = query?.trim();
  const where = q
    ? and(eq(products.vendorId, vendorId), eq(products.active, true),
        or(ilike(products.name, `%${q}%`), ilike(products.description, `%${q}%`)))
    : and(eq(products.vendorId, vendorId), eq(products.active, true));
  const rows = await db.select().from(products).where(where).orderBy(asc(products.name)).limit(20);
  if (rows.length || !q) return rows;
  // Fall back to the whole catalog so the agent can still suggest something real.
  return db.select().from(products).where(and(eq(products.vendorId, vendorId), eq(products.active, true))).orderBy(asc(products.name)).limit(20);
}

export async function productForVendor(db: DB, vendorId: string, productId: string) {
  return (await db.select().from(products)
    .where(and(eq(products.id, productId), eq(products.vendorId, vendorId))).limit(1))[0] ?? null;
}

export async function reviewsFor(db: DB, vendorId: string, productId?: string) {
  const where = productId
    ? and(eq(reviews.vendorId, vendorId), or(eq(reviews.productId, productId), isNull(reviews.productId)))
    : eq(reviews.vendorId, vendorId);
  const rows = await db.select().from(reviews).where(where).orderBy(desc(reviews.createdAt)).limit(5);
  if (rows.length || !productId) return rows;
  return db.select().from(reviews).where(eq(reviews.vendorId, vendorId)).orderBy(desc(reviews.createdAt)).limit(5);
}

export async function deliveryQuote(db: DB, vendorId: string, country: string, region?: string | (string | null | undefined)[]): Promise<DeliveryQuote | null> {
  const zones = await db.select().from(deliveryZones).where(eq(deliveryZones.vendorId, vendorId));
  return quoteDelivery(zones, country, region);
}

async function isReturningBuyer(db: DB, conv: Conversation) {
  const prior = await db.select({ id: orders.id }).from(orders)
    .innerJoin(conversations, eq(orders.conversationId, conversations.id))
    .where(and(eq(conversations.vendorId, conv.vendorId), eq(conversations.buyerRef, conv.buyerRef), eq(orders.status, "delivered")))
    .limit(1);
  return prior.length > 0;
}

async function liveOffers(db: DB, conversationId: string, productId: string, qty: number) {
  return db.select().from(offers)
    .where(and(eq(offers.conversationId, conversationId), eq(offers.productId, productId), eq(offers.qty, qty), gt(offers.expiresAt, new Date())))
    .orderBy(asc(offers.createdAt));
}

export async function makeOffer(db: DB, input: {
  vendor: Vendor; conv: Conversation; productId: string; qty: number; buyerOfferMinor?: number;
}): Promise<{ product: Product; decision: OfferDecision }> {
  const product = await productForVendor(db, input.vendor.id, input.productId);
  if (!product) throw new UserFacingError("That product isn't in this shop's catalog.");
  if (product.stock !== null && product.stock < input.qty) {
    throw new UserFacingError(`Only ${product.stock} of ${product.name} in stock.`);
  }
  const history = await liveOffers(db, input.conv.id, product.id, input.qty);
  const accepted = history.findLast((o) => o.decision === "accept");
  if (accepted) {
    // Already agreed: keep the deal stable, never renegotiate upward.
    return { product, decision: { decision: "accept", unitPriceMinor: accepted.unitPriceMinor, final: true } };
  }
  const decision = evaluateOffer({
    product,
    qty: input.qty,
    offerMinor: input.buyerOfferMinor,
    previousCounters: history.map((o) => o.unitPriceMinor),
    returning: await isReturningBuyer(db, input.conv),
    playbook: playbookFor(input.vendor),
  });
  await db.insert(offers).values({
    conversationId: input.conv.id,
    productId: product.id,
    qty: input.qty,
    buyerOfferMinor: input.buyerOfferMinor ?? null,
    unitPriceMinor: decision.unitPriceMinor,
    decision: decision.decision,
    final: decision.final,
    expiresAt: new Date(Date.now() + OFFER_TTL_MS),
  });
  await logEvent(db, { vendorId: input.vendor.id, conversationId: input.conv.id, type: `offer.${decision.decision}`,
    data: { productId: product.id, qty: input.qty, buyerOfferMinor: input.buyerOfferMinor, unitPriceMinor: decision.unitPriceMinor } });
  return { product, decision };
}

/** The unit price checkout will charge: an accepted offer if one is live, else the list/tier price. */
export async function agreedUnitPrice(db: DB, vendor: Vendor, conv: Conversation, product: Product, qty: number) {
  const history = await liveOffers(db, conv.id, product.id, qty);
  const accepted = history.findLast((o) => o.decision === "accept");
  if (accepted) return accepted.unitPriceMinor;
  return unitPriceFor(product, qty, { returning: await isReturningBuyer(db, conv), playbook: playbookFor(vendor) });
}

export function railFor(currency: Currency) {
  return PAYPAL_CURRENCIES.has(currency) ? "paypal" as const : "bank_transfer" as const;
}

export function newOrderRef() {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = randomBytes(6);
  return "OJA-" + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export class UserFacingError extends Error {}

export type CheckoutDeps = {
  createCheckout: typeof import("./paypal").createCheckout;
  baseUrl: string;
};

export async function placeOrder(db: DB, deps: CheckoutDeps, input: {
  vendor: Vendor; conv: Conversation;
  items: { productId: string; qty: number }[];
  shipTo: ShipTo; buyerEmail?: string; note?: string;
}): Promise<Order> {
  const { vendor, conv } = input;
  if (!input.items.length) throw new UserFacingError("The order has no items.");
  const lines: OrderLine[] = [];
  let leadDays = 0;
  for (const item of input.items) {
    if (!Number.isInteger(item.qty) || item.qty < 1 || item.qty > 500) throw new UserFacingError("Quantity must be a whole number from 1 to 500.");
    const product = await productForVendor(db, vendor.id, item.productId);
    if (!product) throw new UserFacingError("One of those products isn't in this shop's catalog.");
    if (product.stock !== null && product.stock < item.qty) throw new UserFacingError(`Only ${product.stock} of ${product.name} in stock.`);
    lines.push({ productId: product.id, name: product.name, qty: item.qty, unitPriceMinor: await agreedUnitPrice(db, vendor, conv, product, item.qty) });
    leadDays = Math.max(leadDays, product.leadTimeDays);
  }
  const quote = await deliveryQuote(db, vendor.id, input.shipTo.country, [input.shipTo.city, input.shipTo.state]);
  if (!quote) throw new UserFacingError(`${vendor.name} doesn't deliver to ${input.shipTo.country} yet.`);

  const subtotal = lines.reduce((s, l) => s + l.unitPriceMinor * l.qty, 0);
  const total = subtotal + quote.costMinor;
  const rail = railFor(vendor.currency);
  const ref = newOrderRef();

  const [order] = await db.insert(orders).values({
    ref, vendorId: vendor.id, conversationId: conv.id, lines, currency: vendor.currency,
    subtotalMinor: subtotal, shippingMinor: quote.costMinor, totalMinor: total, rail,
    buyerEmail: input.buyerEmail ?? null, shipTo: input.shipTo, carrier: quote.carrier,
    etaDaysMin: quote.etaDaysMin + leadDays, etaDaysMax: quote.etaDaysMax + leadDays,
  }).returning();

  if (rail === "paypal") {
    const { paypalOrderId, approveUrl } = await deps.createCheckout({
      currency: "USD", lines, shippingMinor: quote.costMinor, shipTo: input.shipTo,
      returnUrl: `${deps.baseUrl}/pay/return?ref=${ref}`,
      cancelUrl: `${deps.baseUrl}/pay/cancel?ref=${ref}`,
      note: `${vendor.name} order ${ref}${input.note ? `: ${input.note}` : ""}`.slice(0, 500),
    });
    await db.update(orders).set({ paypalOrderId, paypalApproveUrl: approveUrl }).where(eq(orders.id, order.id));
    order.paypalOrderId = paypalOrderId;
    order.paypalApproveUrl = approveUrl;
  }
  await logEvent(db, { vendorId: vendor.id, orderId: order.id, conversationId: conv.id, type: "order.created",
    data: { ref, totalMinor: total, currency: vendor.currency, rail, lines, note: input.note ?? null } });
  return order;
}

export async function orderByRef(db: DB, ref: string) {
  return (await db.select().from(orders).where(eq(orders.ref, ref)).limit(1))[0] ?? null;
}

export type CaptureFn = typeof import("./paypal").captureOrder;
export type OrderAmountFn = typeof import("./paypal").orderAmount;

/**
 * Buyer came back from PayPal: capture, then check the captured amount matches the
 * order total before marking it paid. Idempotent.
 */
export async function confirmPayPalPayment(db: DB, capture: CaptureFn, ref: string, amountOf?: OrderAmountFn): Promise<Order> {
  const order = await orderByRef(db, ref);
  if (!order || !order.paypalOrderId) throw new UserFacingError("Order not found.");
  if (order.status !== "awaiting_payment") return order;
  // Check what PayPal will charge before taking the money, not only after.
  if (amountOf) {
    const pre = await amountOf(order.paypalOrderId);
    if (pre.amountMinor !== order.totalMinor || pre.currency !== order.currency) {
      await logEvent(db, { vendorId: order.vendorId, orderId: order.id, type: "payment.amount_mismatch",
        data: { expected: order.totalMinor, got: pre.amountMinor, currency: pre.currency, stage: "before_capture" } });
      throw new UserFacingError("The payment amount didn't match the order. Nothing was charged; the seller has been alerted.");
    }
  }
  const result = await capture(order.paypalOrderId);
  if (result.amountMinor !== order.totalMinor || result.currency !== order.currency) {
    await logEvent(db, { vendorId: order.vendorId, orderId: order.id, type: "payment.amount_mismatch",
      data: { expected: order.totalMinor, got: result.amountMinor, currency: result.currency } });
    throw new UserFacingError("The payment amount didn't match the order. The seller has been alerted.");
  }
  // Seller Protection: ship to the address on the PayPal transaction.
  const shipTo: ShipTo = result.shipTo?.line1 && result.shipTo.country
    ? { ...order.shipTo, ...stripUndefined(result.shipTo), name: result.shipTo.name ?? order.shipTo.name } as ShipTo
    : order.shipTo;
  const [updated] = await db.update(orders).set({
    status: "paid", paypalCaptureId: result.captureId, paidAt: new Date(), shipTo,
    buyerEmail: order.buyerEmail ?? result.payerEmail ?? null,
  }).where(and(eq(orders.id, order.id), eq(orders.status, "awaiting_payment"))).returning();
  if (!updated) return (await orderByRef(db, ref))!;
  await decrementStock(db, updated);
  await logEvent(db, { vendorId: order.vendorId, orderId: order.id, type: "payment.captured",
    data: { captureId: result.captureId, amountMinor: result.amountMinor } });
  await addMessage(db, order.conversationId, "system",
    `Payment received for ${order.ref} through PayPal. The seller will ship to the address on your PayPal payment.`);
  return updated;
}

/** Local rail: only the vendor can say a bank transfer arrived. */
export async function vendorConfirmTransfer(db: DB, vendorId: string, orderId: string) {
  const [updated] = await db.update(orders).set({ status: "paid", paidAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.vendorId, vendorId), eq(orders.status, "awaiting_payment"), eq(orders.rail, "bank_transfer")))
    .returning();
  if (!updated) throw new UserFacingError("Order not found or not awaiting a bank transfer.");
  await decrementStock(db, updated);
  await logEvent(db, { vendorId, orderId, type: "payment.transfer_confirmed_by_vendor", data: {} });
  await addMessage(db, updated.conversationId, "system", `${updated.ref}: the seller confirmed your transfer arrived.`);
  return updated;
}

export async function markShipped(db: DB, deps: { addTracking: typeof import("./paypal").addTracking }, vendorId: string, orderId: string, trackingNumber: string) {
  const order = (await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.vendorId, vendorId))).limit(1))[0];
  if (!order || order.status !== "paid") throw new UserFacingError("Only paid orders can be shipped.");
  const tn = trackingNumber.trim();
  if (!/^[A-Za-z0-9-]{4,64}$/.test(tn)) throw new UserFacingError("Tracking numbers are 4–64 letters, digits or dashes.");
  if (order.rail === "paypal" && order.paypalCaptureId) {
    await deps.addTracking({ captureId: order.paypalCaptureId, trackingNumber: tn, carrier: order.carrier ?? "OTHER" });
  }
  const [updated] = await db.update(orders).set({ status: "shipped", trackingNumber: tn }).where(eq(orders.id, order.id)).returning();
  await logEvent(db, { vendorId, orderId, type: "order.shipped", data: { trackingNumber: tn, carrier: order.carrier } });
  await addMessage(db, order.conversationId, "system", `${order.ref} has shipped with ${order.carrier}. Tracking number: ${tn}.`);
  return updated;
}

async function decrementStock(db: DB, order: Order) {
  for (const l of order.lines) {
    const p = (await db.select().from(products).where(eq(products.id, l.productId)).limit(1))[0];
    if (p && p.stock !== null) await db.update(products).set({ stock: Math.max(0, p.stock - l.qty) }).where(eq(products.id, p.id));
  }
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== "")) as Partial<T>;
}

// ---- conversations ----

export async function findConversation(db: DB, vendorId: string, channel: Channel, buyerRef: string) {
  return (await db.select().from(conversations)
    .where(and(eq(conversations.vendorId, vendorId), eq(conversations.channel, channel), eq(conversations.buyerRef, buyerRef))).limit(1))[0] ?? null;
}

export async function getOrCreateConversation(db: DB, vendorId: string, channel: Channel, buyerRef: string, buyerName?: string) {
  const existing = (await db.select().from(conversations)
    .where(and(eq(conversations.vendorId, vendorId), eq(conversations.channel, channel), eq(conversations.buyerRef, buyerRef))).limit(1))[0];
  if (existing) return existing;
  const [created] = await db.insert(conversations).values({ vendorId, channel, buyerRef, buyerName: buyerName ?? null })
    .onConflictDoNothing().returning();
  return created ?? (await db.select().from(conversations)
    .where(and(eq(conversations.vendorId, vendorId), eq(conversations.channel, channel), eq(conversations.buyerRef, buyerRef))).limit(1))[0];
}

export async function addMessage(db: DB, conversationId: string, role: MessageRole, body: string, opts: { status?: MessageStatus; externalId?: string } = {}) {
  const [m] = await db.insert(messages).values({ conversationId, role, body, status: opts.status ?? "sent", externalId: opts.externalId ?? null })
    .onConflictDoNothing().returning();
  if (role === "buyer" && m) await db.update(conversations).set({ lastBuyerMessageAt: new Date() }).where(eq(conversations.id, conversationId));
  return m ?? null;
}

export async function history(db: DB, conversationId: string, opts: { includeDrafts?: boolean } = {}) {
  const rows = await db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(asc(messages.createdAt));
  return rows.filter((m) => m.status === "sent" || (opts.includeDrafts && m.status === "draft"));
}

export async function logEvent(db: DB, e: { vendorId: string; orderId?: string; conversationId?: string; type: string; data: Record<string, unknown> }) {
  await db.insert(events).values({ vendorId: e.vendorId, orderId: e.orderId ?? null, conversationId: e.conversationId ?? null, type: e.type, data: e.data });
}
