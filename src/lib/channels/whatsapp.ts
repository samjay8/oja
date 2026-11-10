// WhatsApp Cloud API. Parsing and sending live in ./meta (shared with Messenger and
// Instagram). Reminders outside the 24-hour window go through PayPal invoice emails.

import "server-only";
import { verifyMetaSignature } from "./meta";

export function whatsappConfigured() {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.META_APP_SECRET);
}

export function verifySignature(rawBody: string, header: string | null): boolean {
  return verifyMetaSignature(rawBody, header);
}
