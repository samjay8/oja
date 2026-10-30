// WhatsApp Cloud API adapter. Webhook in: verify signature, map to vendor, store the
// buyer message. Out: plain text replies inside the 24-hour customer-service window.
// Reminders outside the window go through PayPal invoice emails, not WhatsApp.

import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const GRAPH = `https://graph.facebook.com/${process.env.META_GRAPH_VERSION ?? "v23.0"}`;

export function whatsappConfigured() {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.META_APP_SECRET && process.env.WHATSAPP_VERIFY_TOKEN);
}

export function verifySignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !header?.startsWith("sha256=")) return false;
  const want = createHmac("sha256", secret).update(rawBody).digest("hex");
  const got = header.slice("sha256=".length);
  return got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

export type InboundText = { phoneNumberId: string; from: string; name?: string; id: string; text: string; timestamp: number };

type WebhookBody = {
  object?: string;
  entry?: {
    changes?: {
      field?: string;
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: { wa_id?: string; profile?: { name?: string } }[];
        messages?: { from: string; id: string; timestamp: string; type: string; text?: { body: string }; button?: { text: string }; interactive?: { button_reply?: { title: string }; list_reply?: { title: string } } }[];
      };
    }[];
  }[];
};

/** Text-like inbound messages. Media and reactions are ignored for now. */
export function parseInbound(body: WebhookBody): InboundText[] {
  const out: InboundText[] = [];
  if (body.object !== "whatsapp_business_account") return out;
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const v = change.value;
      const pnid = v?.metadata?.phone_number_id;
      if (!pnid) continue;
      for (const m of v?.messages ?? []) {
        const text = m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title;
        if (!text) continue;
        const name = v?.contacts?.find((c) => c.wa_id === m.from)?.profile?.name;
        out.push({ phoneNumberId: pnid, from: m.from, name, id: m.id, text, timestamp: Number(m.timestamp) * 1000 });
      }
    }
  }
  return out;
}

export async function sendText(phoneNumberId: string, to: string, body: string) {
  const res = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { preview_url: true, body: body.slice(0, 4096) } }),
  });
  if (!res.ok) throw new Error(`WhatsApp send failed: ${res.status} ${await res.text()}`);
}
