import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { channelConnections } from "@/db/schema";
import type { Conversation, Vendor } from "../commerce";
import { decrypt } from "../crypto";
import { probe, sendFor, sendWhatsApp } from "./meta";

export type ChannelConnection = typeof channelConnections.$inferSelect;

/** Push a sent message out to the buyer's channel. Web chat polls, so it needs nothing. */
export async function deliver(vendor: Vendor, conv: Conversation, body: string) {
  if (conv.channel === "web") return;
  const channel = conv.channel;
  const db = await getDb();
  const row = (await db.select().from(channelConnections)
    .where(and(eq(channelConnections.vendorId, vendor.id), eq(channelConnections.channel, channel), eq(channelConnections.active, true)))
    .limit(1))[0];
  if (row) return sendFor(channel)(row.externalId, decrypt(row.accessTokenEnc), conv.buyerRef, body);
  if (channel === "whatsapp") {
    const pnid = vendor.whatsappPhoneNumberId ?? process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.WHATSAPP_TOKEN;
    if (!pnid || !token) throw new Error("WhatsApp is not configured");
    return sendWhatsApp(pnid, token, conv.buyerRef, body);
  }
  throw new Error(`${channel} is not connected for this shop`);
}

/** Check a stored connection's token against Meta. */
export async function verifyConnection(row: ChannelConnection): Promise<{ ok: boolean; detail: string }> {
  let token: string;
  try { token = decrypt(row.accessTokenEnc); } catch { return { ok: false, detail: "Stored token can't be decrypted (encryption key changed?). Reconnect." }; }
  return probe(row.channel, row.externalId, token);
}
