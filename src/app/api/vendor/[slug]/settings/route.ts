import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { vendors } from "@/db/schema";
import { currentVendor, json } from "@/lib/app";
import { logEvent, playbookFor } from "@/lib/commerce";
import { LANGUAGE_CODES, type LanguageCode } from "@/lib/languages";
import { toMinor } from "../catalog/validate";

const optionalText = (max: number) =>
  z.string().trim().max(max).transform((s) => (s === "" ? null : s)).nullable().optional();

const Settings = z.object({
  replyMode: z.enum(["copilot", "autopilot"]).optional(),
  language: z.enum(LANGUAGE_CODES as [LanguageCode, ...LanguageCode[]]).optional(),
  tagline: optionalText(140),
  salesScript: optionalText(4000),
  bankTransferDetails: optionalText(500),
  playbook: z.object({
    maxRounds: z.number().int().min(1).max(6),
    concession: z.number().min(0.1).max(0.9),
    loyaltyDiscount: z.number().min(0).max(0.3),
    priceStep: z.union([z.string(), z.number()]),
  }).partial().optional(),
}).strict();

function view(v: NonNullable<Awaited<ReturnType<typeof currentVendor>>>) {
  const pb = playbookFor(v);
  return {
    name: v.name, slug: v.slug, country: v.country, currency: v.currency,
    replyMode: v.replyMode, language: v.language, tagline: v.tagline, salesScript: v.salesScript,
    bankTransferDetails: v.bankTransferDetails, paypalVerified: v.paypalVerified, paypalMerchantEmail: v.paypalMerchantEmail,
    playbook: { maxRounds: pb.maxRounds, concession: pb.concession, loyaltyDiscount: pb.loyaltyDiscount, priceStepMinor: pb.priceStepMinor },
    dashboardKeySet: Boolean(v.dashboardKeyHash),
  };
}

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/vendor/[slug]/settings">) {
  const { slug } = await ctx.params;
  const vendor = await currentVendor(slug);
  if (!vendor) return json({ error: "signed out" }, 401);
  return json(view(vendor));
}

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/vendor/[slug]/settings">) {
  const { slug } = await ctx.params;
  const vendor = await currentVendor(slug);
  if (!vendor) return json({ error: "signed out" }, 401);
  const parsed = Settings.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return json({ error: i ? `${i.path.join(".") || "input"}: ${i.message}` : "bad request" }, 400);
  }
  const { playbook, ...rest } = parsed.data;
  const set: Partial<typeof vendors.$inferInsert> = { ...rest };

  if (playbook) {
    const next = { ...vendor.playbook };
    if (playbook.maxRounds !== undefined) next.maxRounds = playbook.maxRounds;
    if (playbook.concession !== undefined) next.concession = Math.round(playbook.concession * 100) / 100;
    if (playbook.loyaltyDiscount !== undefined) next.loyaltyDiscount = Math.round(playbook.loyaltyDiscount * 1000) / 1000;
    if (playbook.priceStep !== undefined) {
      let step: number;
      try {
        step = toMinor(playbook.priceStep);
      } catch {
        return json({ error: "Price step must be a number like 100 or 0.50" }, 400);
      }
      if (step < 1) return json({ error: "Price step must be more than zero" }, 400);
      next.priceStepMinor = step;
    }
    set.playbook = next;
  }
  if (!Object.keys(set).length) return json({ error: "nothing to save" }, 400);

  const db = await getDb();
  const [updated] = await db.update(vendors).set(set).where(eq(vendors.id, vendor.id)).returning();
  await logEvent(db, { vendorId: vendor.id, type: "settings.saved", data: { fields: Object.keys(set), replyMode: updated.replyMode, playbook: updated.playbook } });
  return json({ ok: true, settings: view(updated) });
}
