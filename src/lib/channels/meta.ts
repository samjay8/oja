// Meta channels: WhatsApp Cloud API, Messenger and Instagram Messaging (Instagram
// Login). One webhook shape in (parseMetaWebhook), one sender per channel out.
// Replies are plain text inside each channel's 24-hour customer-service window.

import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Channel } from "@/db/schema";

export type MetaChannel = Exclude<Channel, "web">;

const version = () => process.env.META_GRAPH_VERSION || "v23.0";
export const graphFacebook = () => `https://graph.facebook.com/${version()}`;
export const graphInstagram = () => `https://graph.instagram.com/${version()}`;

export const LIMITS: Record<MetaChannel, number> = { whatsapp: 4096, messenger: 1000, instagram: 1000 };

/** X-Hub-Signature-256 is HMAC-SHA256 of the raw body with the app secret. */
export function verifyMetaSignature(rawBody: string, header: string | null, secret = process.env.META_APP_SECRET): boolean {
  if (!secret || !header?.startsWith("sha256=")) return false;
  const want = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  const hex = header.slice("sha256=".length);
  if (!/^[0-9a-f]{64}$/i.test(hex)) return false;
  return timingSafeEqual(Buffer.from(hex, "hex"), want);
}

export type Inbound = {
  channel: MetaChannel;
  /** WhatsApp phone_number_id, Facebook Page id, or Instagram account id. */
  externalId: string;
  senderId: string;
  senderName?: string;
  messageId: string;
  text: string;
};

type WaMessage = {
  from?: string; id?: string; type?: string;
  text?: { body?: string }; button?: { text?: string };
  interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
};
type MessagingEvent = {
  sender?: { id?: string };
  recipient?: { id?: string };
  message?: { mid?: string; text?: string; is_echo?: boolean; quick_reply?: { payload?: string } };
};
type MetaBody = {
  object?: string;
  entry?: {
    id?: string;
    messaging?: MessagingEvent[];
    changes?: {
      field?: string;
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: { wa_id?: string; profile?: { name?: string } }[];
        messages?: WaMessage[];
      };
    }[];
  }[];
};

/** Normalised inbound text messages. Media, reactions, reads and echoes are ignored. Duplicates within one payload are dropped. */
export function parseMetaWebhook(input: unknown): Inbound[] {
  const body = (input ?? {}) as MetaBody;
  const out: Inbound[] = [];
  const seen = new Set<string>();
  const push = (m: Inbound) => {
    const key = `${m.channel}:${m.messageId}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(m);
  };
  if (!Array.isArray(body.entry)) return out;

  if (body.object === "whatsapp_business_account") {
    for (const entry of body.entry) {
      for (const change of entry.changes ?? []) {
        const v = change.value;
        const pnid = v?.metadata?.phone_number_id;
        if (!pnid) continue;
        for (const m of v?.messages ?? []) {
          const text = m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title;
          if (!text?.trim() || !m.from || !m.id) continue;
          const senderName = v?.contacts?.find((c) => c.wa_id === m.from)?.profile?.name;
          push({ channel: "whatsapp", externalId: pnid, senderId: m.from, senderName, messageId: m.id, text });
        }
      }
    }
    return out;
  }

  const channel: MetaChannel | null = body.object === "page" ? "messenger" : body.object === "instagram" ? "instagram" : null;
  if (!channel) return out;
  for (const entry of body.entry) {
    for (const ev of entry.messaging ?? []) {
      const msg = ev.message;
      if (!msg || msg.is_echo || !msg.mid || !msg.text?.trim()) continue;
      const senderId = ev.sender?.id;
      const externalId = entry.id ?? ev.recipient?.id;
      if (!senderId || !externalId) continue;
      push({ channel, externalId, senderId, messageId: msg.mid, text: msg.text });
    }
  }
  return out;
}

/** Split text into chunks of at most `limit` chars, preferring sentence, then line, then word boundaries. */
export function chunkText(text: string, limit: number): string[] {
  const chunks: string[] = [];
  let rest = text.trim();
  while (rest.length > limit) {
    const window = rest.slice(0, limit + 1);
    let cut = -1;
    for (const re of [/[.!?。！？]\s/g, /\n/g, /\s/g]) {
      let last = -1;
      for (const m of window.matchAll(re)) {
        // Keep the punctuation with the sentence it ends.
        const end = m.index + (m[0].length > 1 ? 1 : 0);
        if (end <= limit && end > 0) last = end;
      }
      if (last > limit / 3) { cut = last; break; }
    }
    if (cut <= 0) cut = limit;
    chunks.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

async function post(url: string, init: RequestInit, label: string) {
  const res = await fetch(url, { method: "POST", ...init });
  if (!res.ok) throw new Error(`${label} send failed: ${res.status} ${(await res.text()).slice(0, 500)}`);
}

export async function sendWhatsApp(phoneNumberId: string, token: string, to: string, body: string) {
  for (const part of chunkText(body, LIMITS.whatsapp)) {
    await post(`${graphFacebook()}/${phoneNumberId}/messages`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { preview_url: true, body: part } }),
    }, "WhatsApp");
  }
}

export async function sendMessenger(pageId: string, pageToken: string, psid: string, body: string) {
  for (const part of chunkText(body, LIMITS.messenger)) {
    await post(`${graphFacebook()}/${pageId}/messages?access_token=${encodeURIComponent(pageToken)}`, {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient: { id: psid }, messaging_type: "RESPONSE", message: { text: part } }),
    }, "Messenger");
  }
}

export async function sendInstagram(igId: string, token: string, igsid: string, body: string) {
  for (const part of chunkText(body, LIMITS.instagram)) {
    await post(`${graphInstagram()}/${igId}/messages`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ recipient: { id: igsid }, message: { text: part } }),
    }, "Instagram");
  }
}

export function sendFor(channel: MetaChannel) {
  return channel === "whatsapp" ? sendWhatsApp : channel === "messenger" ? sendMessenger : sendInstagram;
}

/** Cheap read that proves the token can see the account. */
export async function probe(channel: MetaChannel, externalId: string, token: string): Promise<{ ok: boolean; detail: string }> {
  const url = channel === "whatsapp"
    ? `${graphFacebook()}/${encodeURIComponent(externalId)}?fields=display_phone_number,verified_name`
    : channel === "messenger"
      ? `${graphFacebook()}/${encodeURIComponent(externalId)}?fields=id,name`
      : `${graphInstagram()}/me?fields=user_id,username`;
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: { message?: string } };
    if (!res.ok) return { ok: false, detail: `Meta said ${res.status}: ${data.error?.message ?? "unknown error"}` };
    if (channel === "whatsapp") return { ok: true, detail: `${data.verified_name ?? "WhatsApp number"} (${data.display_phone_number ?? externalId})` };
    if (channel === "messenger") return { ok: true, detail: `Page ${data.name ?? externalId}` };
    // Instagram Login tokens belong to one account; user_id is the id webhooks use.
    if (data.user_id && String(data.user_id) !== externalId) {
      return { ok: false, detail: `Token belongs to Instagram account ${String(data.user_id)}, not ${externalId}` };
    }
    return { ok: true, detail: `@${data.username ?? externalId}` };
  } catch (e) {
    return { ok: false, detail: `Could not reach Meta: ${e instanceof Error ? e.message : String(e)}` };
  }
}
