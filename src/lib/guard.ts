// Last line of defence: a reply may only mention money amounts and links that Oja's
// code produced. Anything else is held for the vendor instead of reaching the buyer.

const AMOUNT = /(?:US\$|\$|₦|£|€|NGN\s?|USD\s?|GBP\s?|EUR\s?)\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?|(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?\s?(?:naira|dollars?|pounds?|euros?|k\b)/gi;
const URL_RE = /https?:\/\/[^\s)<>"']+/gi;

/** Minor units for every amount written in the text. "15k" counts as 15,000. */
export function amountsIn(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(AMOUNT)) {
    const whole = (m[1] ?? m[3] ?? "").replace(/,/g, "");
    const frac = m[2] ?? m[4] ?? "";
    if (!whole) continue;
    let minor = Number(whole) * 100 + Number(frac.padEnd(2, "0") || 0);
    if (/k\b/i.test(m[0]) && !/\./.test(m[0])) minor = Number(whole) * 1000 * 100;
    out.push(minor);
  }
  return out;
}

export function urlsIn(text: string): string[] {
  return [...text.matchAll(URL_RE)].map((m) => m[0].replace(/[.,!?]+$/, ""));
}

export type GuardResult = { ok: true } | { ok: false; reasons: string[] };

export function checkReply(reply: string, allowed: { amounts: Set<number>; urls: Set<string>; urlPrefixes?: string[] }): GuardResult {
  const reasons: string[] = [];
  for (const a of amountsIn(reply)) {
    if (!allowed.amounts.has(a)) reasons.push(`unverified amount ${(a / 100).toFixed(2)}`);
  }
  for (const u of urlsIn(reply)) {
    const okUrl = allowed.urls.has(u) || (allowed.urlPrefixes ?? []).some((p) => u.startsWith(p));
    if (!okUrl) reasons.push(`unverified link ${u}`);
  }
  return reasons.length ? { ok: false, reasons } : { ok: true };
}
