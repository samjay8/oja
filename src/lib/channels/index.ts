import "server-only";
import type { Conversation, Vendor } from "../commerce";
import { sendText, whatsappConfigured } from "./whatsapp";

/** Push a sent message out to the buyer's channel. Web chat polls, so it needs nothing. */
export async function deliver(vendor: Vendor, conv: Conversation, body: string) {
  switch (conv.channel) {
    case "web":
      return;
    case "whatsapp": {
      const pnid = vendor.whatsappPhoneNumberId ?? process.env.WHATSAPP_PHONE_NUMBER_ID;
      if (!whatsappConfigured() || !pnid) throw new Error("WhatsApp is not configured");
      return sendText(pnid, conv.buyerRef, body);
    }
    default:
      throw new Error(`Channel ${conv.channel} is not connected yet`);
  }
}
