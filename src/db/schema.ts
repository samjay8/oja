import { sql } from "drizzle-orm";
import { boolean, integer, jsonb, pgTable, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import type { Playbook, QtyTier } from "@/lib/pricing";
import type { Currency } from "@/lib/money";

const id = () => text("id").primaryKey().default(sql`gen_random_uuid()::text`);
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export type ReplyMode = "copilot" | "autopilot";
export type Channel = "web" | "whatsapp" | "messenger" | "instagram";

export const vendors = pgTable("vendors", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  tagline: text("tagline"),
  country: text("country").notNull(), // ISO-3166 alpha-2
  currency: text("currency").$type<Currency>().notNull(),
  /** Verified payee: PayPal checkout always pays this business's own account. */
  paypalVerified: boolean("paypal_verified").notNull().default(false),
  paypalMerchantEmail: text("paypal_merchant_email"),
  /** Local rail for domestic naira sales (vendor confirms receipt; the AI never marks it paid). */
  bankTransferDetails: text("bank_transfer_details"),
  replyMode: text("reply_mode").$type<ReplyMode>().notNull().default("copilot"),
  playbook: jsonb("playbook").$type<Partial<Playbook>>().notNull().default({}),
  salesScript: text("sales_script"),
  /** sha256 of the vendor dashboard key. */
  dashboardKeyHash: text("dashboard_key_hash").notNull(),
  whatsappPhoneNumberId: text("whatsapp_phone_number_id").unique(),
  createdAt: createdAt(),
});

export const products = pgTable("products", {
  id: id(),
  vendorId: text("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  listPriceMinor: integer("list_price_minor").notNull(),
  minPriceMinor: integer("min_price_minor").notNull(),
  tiers: jsonb("tiers").$type<QtyTier[]>().notNull().default([]),
  stock: integer("stock"), // null = made to order
  leadTimeDays: integer("lead_time_days").notNull().default(0),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
}, (t) => [index("products_vendor_idx").on(t.vendorId)]);

export const reviews = pgTable("reviews", {
  id: id(),
  vendorId: text("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  productId: text("product_id").references(() => products.id, { onDelete: "set null" }),
  author: text("author").notNull(),
  rating: integer("rating").notNull(),
  body: text("body").notNull(),
  createdAt: createdAt(),
});

export const deliveryZones = pgTable("delivery_zones", {
  id: id(),
  vendorId: text("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  country: text("country").notNull(),
  region: text("region"),
  costMinor: integer("cost_minor").notNull(),
  etaDaysMin: integer("eta_days_min").notNull(),
  etaDaysMax: integer("eta_days_max").notNull(),
  carrier: text("carrier").notNull(),
  tracked: boolean("tracked").notNull().default(true),
});

export const conversations = pgTable("conversations", {
  id: id(),
  vendorId: text("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  channel: text("channel").$type<Channel>().notNull(),
  /** Channel-side identity: web session id, WhatsApp wa_id, PSID, IGSID. */
  buyerRef: text("buyer_ref").notNull(),
  buyerName: text("buyer_name"),
  /** Human took over: the AI stops drafting until released. */
  aiPaused: boolean("ai_paused").notNull().default(false),
  needsHuman: boolean("needs_human").notNull().default(false),
  lastBuyerMessageAt: timestamp("last_buyer_message_at", { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("conversations_buyer_uq").on(t.vendorId, t.channel, t.buyerRef)]);

export type MessageRole = "buyer" | "agent" | "vendor" | "system";
export type MessageStatus = "sent" | "draft" | "discarded";

export const messages = pgTable("messages", {
  id: id(),
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").$type<MessageRole>().notNull(),
  status: text("status").$type<MessageStatus>().notNull().default("sent"),
  body: text("body").notNull(),
  /** Channel message id, for de-duplicating webhook retries. */
  externalId: text("external_id").unique(),
  createdAt: createdAt(),
}, (t) => [index("messages_conv_idx").on(t.conversationId, t.createdAt)]);

/** Every price Oja has said out loud. Checkout reads prices from here, never from the model. */
export const offers = pgTable("offers", {
  id: id(),
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  qty: integer("qty").notNull(),
  buyerOfferMinor: integer("buyer_offer_minor"),
  unitPriceMinor: integer("unit_price_minor").notNull(),
  decision: text("decision").$type<"accept" | "counter">().notNull(),
  final: boolean("final").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
}, (t) => [index("offers_conv_product_idx").on(t.conversationId, t.productId)]);

export type OrderStatus = "awaiting_payment" | "paid" | "shipped" | "delivered" | "cancelled";
export type PaymentRail = "paypal" | "bank_transfer";
export type OrderLine = { productId: string; name: string; qty: number; unitPriceMinor: number };
export type ShipTo = {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
};

export const orders = pgTable("orders", {
  id: id(),
  /** Short human reference shown to buyers, e.g. OJA-7K2Q. */
  ref: text("ref").notNull().unique(),
  vendorId: text("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  lines: jsonb("lines").$type<OrderLine[]>().notNull(),
  currency: text("currency").$type<Currency>().notNull(),
  subtotalMinor: integer("subtotal_minor").notNull(),
  shippingMinor: integer("shipping_minor").notNull(),
  totalMinor: integer("total_minor").notNull(),
  rail: text("rail").$type<PaymentRail>().notNull(),
  status: text("status").$type<OrderStatus>().notNull().default("awaiting_payment"),
  buyerEmail: text("buyer_email"),
  shipTo: jsonb("ship_to").$type<ShipTo>().notNull(),
  carrier: text("carrier"),
  etaDaysMin: integer("eta_days_min"),
  etaDaysMax: integer("eta_days_max"),
  paypalOrderId: text("paypal_order_id").unique(),
  paypalApproveUrl: text("paypal_approve_url"),
  paypalCaptureId: text("paypal_capture_id").unique(),
  trackingNumber: text("tracking_number"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: createdAt(),
});

/** Append-only audit trail (evidence for disputes, and the judge-facing story). */
export const events = pgTable("events", {
  id: id(),
  vendorId: text("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  orderId: text("order_id").references(() => orders.id, { onDelete: "cascade" }),
  conversationId: text("conversation_id").references(() => conversations.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: createdAt(),
}, (t) => [index("events_vendor_idx").on(t.vendorId, t.createdAt)]);
