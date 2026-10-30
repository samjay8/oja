import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { conversations, messages, vendors } from "@/db/schema";
import { runAgentTurn } from "@/lib/agent";
import { baseUrl, currentVendor, json } from "@/lib/app";
import { deliver } from "@/lib/channels";
import { addMessage, logEvent, markShipped, UserFacingError, vendorConfirmTransfer } from "@/lib/commerce";
import { addTracking } from "@/lib/paypal";

const Action = z.discriminatedUnion("type", [
  z.object({ type: z.literal("approve_draft"), messageId: z.string(), body: z.string().trim().min(1).max(4000).optional() }),
  z.object({ type: z.literal("discard_draft"), messageId: z.string() }),
  z.object({ type: z.literal("send"), conversationId: z.string(), body: z.string().trim().min(1).max(4000) }),
  z.object({ type: z.literal("pause_ai"), conversationId: z.string(), paused: z.boolean() }),
  z.object({ type: z.literal("resolve"), conversationId: z.string() }),
  z.object({ type: z.literal("redraft"), conversationId: z.string() }),
  z.object({ type: z.literal("confirm_transfer"), orderId: z.string() }),
  z.object({ type: z.literal("ship"), orderId: z.string(), trackingNumber: z.string() }),
  z.object({ type: z.literal("set_mode"), mode: z.enum(["copilot", "autopilot"]) }),
]);

export async function POST(req: NextRequest, ctx: RouteContext<"/api/vendor/[slug]/action">) {
  const { slug } = await ctx.params;
  const vendor = await currentVendor(slug);
  if (!vendor) return json({ error: "signed out" }, 401);
  const parsed = Action.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "bad request" }, 400);
  const a = parsed.data;
  const db = await getDb();

  const ownConv = async (id: string) =>
    (await db.select().from(conversations).where(and(eq(conversations.id, id), eq(conversations.vendorId, vendor.id))).limit(1))[0];
  const ownMessage = async (id: string) => {
    const m = (await db.select().from(messages).where(eq(messages.id, id)).limit(1))[0];
    const c = m && (await ownConv(m.conversationId));
    return m && c ? { m, c } : null;
  };

  try {
    switch (a.type) {
      case "approve_draft": {
        const found = await ownMessage(a.messageId);
        if (!found || found.m.status !== "draft") return json({ error: "draft not found" }, 404);
        const body = a.body ?? found.m.body;
        await db.update(messages).set({ status: "sent", body, role: a.body && a.body !== found.m.body ? "vendor" : "agent", createdAt: new Date() })
          .where(eq(messages.id, found.m.id));
        await db.update(conversations).set({ needsHuman: false }).where(eq(conversations.id, found.c.id));
        await deliver(vendor, found.c, body);
        await logEvent(db, { vendorId: vendor.id, conversationId: found.c.id, type: a.body ? "draft.edited_and_sent" : "draft.approved", data: {} });
        break;
      }
      case "discard_draft": {
        const found = await ownMessage(a.messageId);
        if (!found || found.m.status !== "draft") return json({ error: "draft not found" }, 404);
        await db.update(messages).set({ status: "discarded" }).where(eq(messages.id, found.m.id));
        break;
      }
      case "send": {
        const c = await ownConv(a.conversationId);
        if (!c) return json({ error: "not found" }, 404);
        await addMessage(db, c.id, "vendor", a.body);
        await db.update(conversations).set({ needsHuman: false }).where(eq(conversations.id, c.id));
        await deliver(vendor, c, a.body);
        break;
      }
      case "pause_ai": {
        const c = await ownConv(a.conversationId);
        if (!c) return json({ error: "not found" }, 404);
        await db.update(conversations).set({ aiPaused: a.paused }).where(eq(conversations.id, c.id));
        break;
      }
      case "resolve": {
        const c = await ownConv(a.conversationId);
        if (!c) return json({ error: "not found" }, 404);
        await db.update(conversations).set({ needsHuman: false }).where(eq(conversations.id, c.id));
        break;
      }
      case "redraft": {
        const c = await ownConv(a.conversationId);
        if (!c) return json({ error: "not found" }, 404);
        await db.update(messages).set({ status: "discarded" }).where(and(eq(messages.conversationId, c.id), eq(messages.status, "draft")));
        const reply = await runAgentTurn(db, { ...vendor, replyMode: "copilot" }, { ...c, aiPaused: false }, await baseUrl());
        return json({ ok: true, reply });
      }
      case "confirm_transfer":
        await vendorConfirmTransfer(db, vendor.id, a.orderId);
        break;
      case "ship":
        await markShipped(db, { addTracking }, vendor.id, a.orderId, a.trackingNumber);
        break;
      case "set_mode":
        await db.update(vendors).set({ replyMode: a.mode }).where(eq(vendors.id, vendor.id));
        break;
    }
  } catch (e) {
    if (e instanceof UserFacingError) return json({ error: e.message }, 400);
    console.error("[vendor action]", a.type, e);
    return json({ error: e instanceof Error ? e.message : "failed" }, 500);
  }
  return json({ ok: true });
}
