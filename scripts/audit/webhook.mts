// Audit: Meta webhook signature, dedup and routing, plus seller channel connect/test.
//   META_APP_SECRET=<same as the dev server> tsx scripts/audit/webhook.mts
import { createHmac, randomUUID } from "node:crypto";

const BASE = process.env.BASE ?? "http://localhost:3100";
const SECRET = process.env.META_APP_SECRET!;
const VERIFY = process.env.META_WEBHOOK_VERIFY_TOKEN ?? "";
const shop = "ife-textiles";
const sign = (raw: string, secret = SECRET) => `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
const post = (body: unknown, sig?: string) => {
  const raw = JSON.stringify(body);
  return fetch(`${BASE}/api/channels/meta`, { method: "POST", headers: { "content-type": "application/json", ...(sig !== "" ? { "x-hub-signature-256": sig ?? sign(raw) } : {}) }, body: raw });
};

const login = await fetch(`${BASE}/api/vendor/${shop}/login`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "10.77.0.1" }, body: JSON.stringify({ key: process.env.DEMO_VENDOR_KEY ?? "oja-demo-2026" }) });
const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0];
const vapi = (path: string, init: RequestInit = {}) => fetch(`${BASE}/api/vendor/${shop}/${path}`, { ...init, headers: { "content-type": "application/json", cookie, ...(init.headers ?? {}) } });

// Seller connects Messenger and Instagram with fake tokens.
const fake = "EAAGfaketoken" + randomUUID().replace(/-/g, "");
const ids: Record<string, string> = { messenger: "1111122222", instagram: "3333344444" };
for (const [channel, externalId] of Object.entries(ids)) {
  const r = await vapi("channels", { method: "POST", body: JSON.stringify({ channel, externalId, displayName: `Audit ${channel}`, accessToken: fake }) });
  console.log(`connect ${channel}: ${r.status} ${await r.text()}`);
}
const list = (await (await vapi("channels")).json()) as { channels: { id: string; channel: string; tokenHint: string }[] };
console.log("listed:", list.channels.map((c) => `${c.channel} hint=${c.tokenHint} leaksFull=${c.tokenHint.includes(fake)}`).join("; "));
const t = await vapi("channels/test", { method: "POST", body: JSON.stringify({ id: list.channels[0].id }) });
console.log(`test: ${t.status} ${await t.text()}`);
const bad = await vapi("channels", { method: "POST", body: JSON.stringify({ channel: "messenger", externalId: "abc", accessToken: "short" }) });
console.log(`connect invalid: ${bad.status} ${await bad.text()}`);

// Verify handshake.
const v1 = await fetch(`${BASE}/api/channels/meta?hub.mode=subscribe&hub.verify_token=${VERIFY}&hub.challenge=12345`);
const v2 = await fetch(`${BASE}/api/channels/meta?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=12345`);
console.log(`verify ok: ${v1.status} ${await v1.text()} | wrong token: ${v2.status}`);

const wa = { object: "whatsapp_business_account", entry: [{ id: "WABA", changes: [{ field: "messages", value: {
  metadata: { phone_number_id: "999000111" }, contacts: [{ wa_id: "2348000000001", profile: { name: "Audit WA" } }],
  messages: [{ from: "2348000000001", id: `wamid.${randomUUID()}`, type: "text", text: { body: "Hi, how much is delivery to Lagos?" } }],
} }] }] };
const page = { object: "page", entry: [{ id: ids.messenger, messaging: [{ sender: { id: "psid-audit-1" }, recipient: { id: ids.messenger }, message: { mid: `m_${randomUUID()}`, text: "Do you have aso-oke?" } }] }] };
const ig = { object: "instagram", entry: [{ id: ids.instagram, messaging: [{ sender: { id: "igsid-audit-1" }, recipient: { id: ids.instagram }, message: { mid: `ig_${randomUUID()}`, text: "Price of the agbada?" } }] }] };

console.log(`bad signature: ${(await post(wa, sign(JSON.stringify(wa), "wrong"))).status}`);
console.log(`no signature: ${(await post(wa, "")).status}`);
for (const [n, b] of [["whatsapp", wa], ["messenger", page], ["instagram", ig]] as const) {
  const t0 = Date.now();
  const r = await post(b);
  console.log(`${n}: ${r.status} in ${Date.now() - t0}ms`);
}
console.log(`whatsapp duplicate: ${(await post(wa)).status}`);

// Let after() finish the agent turns, then read the inbox.
await new Promise((r) => setTimeout(r, 40_000));
const inbox = (await (await vapi("inbox")).json()) as { conversations: { channel: string; buyerRef: string; buyerName: string | null; needsHuman: boolean; messages: { role: string; status: string; body: string }[] }[] };
for (const c of inbox.conversations.filter((c) => c.channel !== "web")) {
  console.log(`\n[${c.channel}] ${c.buyerRef} ${c.buyerName ?? ""} needsHuman=${c.needsHuman}`);
  for (const m of c.messages) console.log(`  ${m.role}/${m.status}: ${m.body.slice(0, 160)}`);
}
