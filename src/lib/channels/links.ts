// Buyer-facing deep links into a shop's Meta channels. Pure and client-safe.
// The handle is what the public sees (a WhatsApp number, a Page username, an
// Instagram username), never an API id or token.

export type MetaChannel = "whatsapp" | "messenger" | "instagram";

const PATTERN: Record<MetaChannel, RegExp> = {
  // E.164 without the plus: country code + number, 7 to 15 digits.
  whatsapp: /^[1-9]\d{6,14}$/,
  // Facebook Page username (letters, digits, dots) or numeric Page ID.
  messenger: /^[A-Za-z0-9.]{1,50}$/,
  // Instagram username, no @.
  instagram: /^[A-Za-z0-9._]{1,30}$/,
};

/**
 * Turns what a seller types into the stored form: "+234 801-234 5678" becomes
 * "2348012345678", "@ife.textiles" becomes "ife.textiles". Null if it still isn't valid.
 */
export function normalizeHandle(channel: MetaChannel, raw: string): string | null {
  let h = raw.trim();
  if (channel === "whatsapp") h = h.replace(/[\s().-]/g, "").replace(/^\+/, "").replace(/^00/, "");
  else h = h.replace(/^@/, "");
  return isValidHandle(channel, h) ? h : null;
}

export function isValidHandle(channel: MetaChannel, handle: string | null | undefined): handle is string {
  return typeof handle === "string" && PATTERN[channel].test(handle);
}

/** wa.me / m.me / ig.me link a buyer taps to start a chat, or null if the handle is invalid. */
export function channelLink(channel: MetaChannel, handle: string | null | undefined, opts: { text?: string } = {}): string | null {
  if (!isValidHandle(channel, handle)) return null;
  if (channel === "whatsapp") {
    const text = opts.text?.trim();
    return `https://wa.me/${handle}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
  }
  if (channel === "messenger") return `https://m.me/${handle}`;
  return `https://ig.me/m/${handle}`;
}
