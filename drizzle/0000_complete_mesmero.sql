CREATE TABLE "conversations" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"vendor_id" text NOT NULL,
	"channel" text NOT NULL,
	"buyer_ref" text NOT NULL,
	"buyer_name" text,
	"ai_paused" boolean DEFAULT false NOT NULL,
	"needs_human" boolean DEFAULT false NOT NULL,
	"last_buyer_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_zones" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"vendor_id" text NOT NULL,
	"country" text NOT NULL,
	"region" text,
	"cost_minor" integer NOT NULL,
	"eta_days_min" integer NOT NULL,
	"eta_days_max" integer NOT NULL,
	"carrier" text NOT NULL,
	"tracked" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"vendor_id" text NOT NULL,
	"order_id" text,
	"conversation_id" text,
	"type" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"conversation_id" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'sent' NOT NULL,
	"body" text NOT NULL,
	"external_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messages_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"conversation_id" text NOT NULL,
	"product_id" text NOT NULL,
	"qty" integer NOT NULL,
	"buyer_offer_minor" integer,
	"unit_price_minor" integer NOT NULL,
	"decision" text NOT NULL,
	"final" boolean NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"ref" text NOT NULL,
	"vendor_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"lines" jsonb NOT NULL,
	"currency" text NOT NULL,
	"subtotal_minor" integer NOT NULL,
	"shipping_minor" integer NOT NULL,
	"total_minor" integer NOT NULL,
	"rail" text NOT NULL,
	"status" text DEFAULT 'awaiting_payment' NOT NULL,
	"buyer_email" text,
	"ship_to" jsonb NOT NULL,
	"carrier" text,
	"eta_days_min" integer,
	"eta_days_max" integer,
	"paypal_order_id" text,
	"paypal_approve_url" text,
	"paypal_capture_id" text,
	"tracking_number" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_ref_unique" UNIQUE("ref"),
	CONSTRAINT "orders_paypal_order_id_unique" UNIQUE("paypal_order_id"),
	CONSTRAINT "orders_paypal_capture_id_unique" UNIQUE("paypal_capture_id")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"vendor_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"list_price_minor" integer NOT NULL,
	"min_price_minor" integer NOT NULL,
	"tiers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"stock" integer,
	"lead_time_days" integer DEFAULT 0 NOT NULL,
	"image_url" text,
	"video_url" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"vendor_id" text NOT NULL,
	"product_id" text,
	"author" text NOT NULL,
	"rating" integer NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"tagline" text,
	"country" text NOT NULL,
	"currency" text NOT NULL,
	"paypal_verified" boolean DEFAULT false NOT NULL,
	"paypal_merchant_email" text,
	"bank_transfer_details" text,
	"reply_mode" text DEFAULT 'copilot' NOT NULL,
	"playbook" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sales_script" text,
	"dashboard_key_hash" text NOT NULL,
	"whatsapp_phone_number_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vendors_slug_unique" UNIQUE("slug"),
	CONSTRAINT "vendors_whatsapp_phone_number_id_unique" UNIQUE("whatsapp_phone_number_id")
);
--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_zones" ADD CONSTRAINT "delivery_zones_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "conversations_buyer_uq" ON "conversations" USING btree ("vendor_id","channel","buyer_ref");--> statement-breakpoint
CREATE INDEX "events_vendor_idx" ON "events" USING btree ("vendor_id","created_at");--> statement-breakpoint
CREATE INDEX "messages_conv_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "offers_conv_product_idx" ON "offers" USING btree ("conversation_id","product_id");--> statement-breakpoint
CREATE INDEX "products_vendor_idx" ON "products" USING btree ("vendor_id");