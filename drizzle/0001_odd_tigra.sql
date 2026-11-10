CREATE TABLE "channel_connections" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"vendor_id" text NOT NULL,
	"channel" text NOT NULL,
	"external_id" text NOT NULL,
	"display_name" text,
	"access_token_enc" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "language" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "translations" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "language" text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "channel_connections" ADD CONSTRAINT "channel_connections_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "channel_connections_ext_uq" ON "channel_connections" USING btree ("channel","external_id");