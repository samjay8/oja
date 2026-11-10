import type { NextRequest } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { conversations, messages } from "@/db/schema";
import { currentVendor, json } from "@/lib/app";
import { isLanguage } from "@/lib/languages";
import { allow } from "@/lib/ratelimit";
import { translate } from "@/lib/translate";

const Body = z.object({ messageId: z.string().min(1).max(64), to: z.string().refine(isLanguage, "unknown language").optional() });

export async function POST(req: NextRequest, ctx: RouteContext<"/api/vendor/[slug]/translate">) {
  const { slug } = await ctx.params;
  const vendor = await currentVendor(slug);
  if (!vendor) return json({ error: "signed out" }, 401);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "bad request" }, 400);
  const to = parsed.data.to && isLanguage(parsed.data.to) ? parsed.data.to : vendor.language;

  const db = await getDb();
  const msg = (await db.select({ id: messages.id, body: messages.body, translations: messages.translations })
    .from(messages).innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(and(eq(messages.id, parsed.data.messageId), eq(conversations.vendorId, vendor.id))).limit(1))[0];
  if (!msg) return json({ error: "not found" }, 404);

  const cached = msg.translations[to];
  if (cached) return json({ text: cached, to });

  if (!allow(`translate:${vendor.id}`, 30, 5 * 60_000)) return json({ error: "Too many translations. Try again in a few minutes." }, 429);
  let text: string;
  try {
    text = await translate(msg.body, to);
  } catch (e) {
    console.error("[translate] failed", e);
    return json({ error: "Translation isn't available right now." }, 502);
  }
  await db.update(messages)
    .set({ translations: sql`${messages.translations} || ${JSON.stringify({ [to]: text })}::jsonb` })
    .where(eq(messages.id, msg.id));
  return json({ text, to });
}
