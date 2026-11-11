// Audit: seller desk API on the naira copilot shop. Buyer closes a bank-transfer order in
// chat; the seller approves/edits/discards drafts, translates, edits the catalog, and is the
// only one who can confirm the transfer.
//   tsx scripts/audit/desk.mts
import { randomUUID } from "node:crypto";

const BASE = process.env.BASE ?? "http://localhost:3100";
const shop = "tolu-cakes";
const session = randomUUID();
const ip = "10.66.6.6";
const say = async (text: string) => {
  const t0 = Date.now();
  const r = await fetch(`${BASE}/api/chat`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify({ shop, session, text }) });
  const d = (await r.json()) as { messages: { role: string; body: string }[]; sellerReviewing: boolean };
  console.log(`BUYER: ${text}\n  -> ${Date.now() - t0}ms reviewing=${d.sellerReviewing} visibleToBuyer=${d.messages.length}`);
};
const login = await fetch(`${BASE}/api/vendor/${shop}/login`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "10.66.0.2" }, body: JSON.stringify({ key: process.env.DEMO_VENDOR_KEY ?? "oja-demo-2026" }) });
const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0];
const v = async (path: string, method = "GET", body?: unknown, auth = true) => {
  const r = await fetch(`${BASE}/api/vendor/${shop}/${path}`, { method, headers: { "content-type": "application/json", ...(auth ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, data: (await r.json().catch(() => null)) as any }; // eslint-disable-line @typescript-eslint/no-explicit-any
};
type Inbox = { conversations: { id: string; buyerRef: string; needsHuman: boolean; messages: { id: string; role: string; status: string; body: string }[] }[]; orders: { id: string; ref: string; status: string; totalMinor: number; rail: string; conversationId: string }[]; events: { type: string; data: unknown }[] };
const inbox = async () => (await v("inbox")).data as Inbox;
const mine = (i: Inbox) => i.conversations.find((c) => c.buyerRef === session)!;

console.log(`unauthenticated inbox: ${(await v("inbox", "GET", undefined, false)).status}`);
console.log(`wrong key login: ${(await fetch(`${BASE}/api/vendor/${shop}/login`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "10.66.0.3" }, body: JSON.stringify({ key: "nope" }) })).status}`);
console.log(`cross-shop (tolu cookie on ife inbox): ${(await fetch(`${BASE}/api/vendor/ife-textiles/inbox`, { headers: { cookie } })).status}`);

await say("Hi, I need a two-tier red velvet cake for 40 guests this Saturday, delivered in Lekki, Lagos.");
let c = mine(await inbox());
let drafts = c.messages.filter((m) => m.status === "draft");
console.log(`drafts after turn 1: ${drafts.length}`);
const ed = await v("action", "POST", { type: "approve_draft", messageId: drafts.at(-1)!.id, body: drafts.at(-1)!.body + " (Tolu here!)" });
console.log(`edit+send draft: ${ed.status}`);

await say("Abeg how much last? I fit pay 60k.");
c = mine(await inbox());
drafts = c.messages.filter((m) => m.status === "draft");
console.log(`drafts after turn 2: ${drafts.length}`);
console.log(`discard draft: ${(await v("action", "POST", { type: "discard_draft", messageId: drafts.at(-1)!.id })).status}`);
const buyerMsg = c.messages.filter((m) => m.role === "buyer").at(-1)!;
const tr = await v("translate", "POST", { messageId: buyerMsg.id, to: "en" });
console.log(`translate pcm->en: ${tr.status} ${JSON.stringify(tr.data)}`);
const tr2 = await v("translate", "POST", { messageId: buyerMsg.id, to: "en" });
console.log(`translate cached: ${tr2.status}`);

await say("Ok I'll take it at list price. Name: Kemi Ade, 5 Admiralty Way, Lekki, Lagos. Please send account details.");
let i = await inbox();
c = mine(i);
drafts = c.messages.filter((m) => m.status === "draft");
console.log(`draft with bank details:\n  ${drafts.at(-1)?.body}`);
if (drafts.length) console.log(`approve draft: ${(await v("action", "POST", { type: "approve_draft", messageId: drafts.at(-1)!.id })).status}`);
const order = i.orders.find((o) => o.conversationId === c.id);
console.log(`order: ${order ? `${order.ref} ${order.status} ${order.rail} total=${order.totalMinor}` : "none"}`);
if (order) {
  console.log(`ship before paid: ${JSON.stringify(await v("action", "POST", { type: "ship", orderId: order.id, trackingNumber: "RIDER-1" }))}`);
  console.log(`confirm transfer unauthenticated: ${(await v("action", "POST", { type: "confirm_transfer", orderId: order.id }, false)).status}`);
  console.log(`confirm transfer as seller: ${JSON.stringify(await v("action", "POST", { type: "confirm_transfer", orderId: order.id }))}`);
  console.log(`confirm twice: ${JSON.stringify(await v("action", "POST", { type: "confirm_transfer", orderId: order.id }))}`);
  console.log(`ship: ${JSON.stringify(await v("action", "POST", { type: "ship", orderId: order.id, trackingNumber: "RIDER-1" }))}`);
  i = await inbox();
  console.log(`order now: ${i.orders.find((o) => o.id === order.id)?.status}`);
  const buyerView = (await (await fetch(`${BASE}/api/chat?shop=${shop}&session=${session}`)).json()) as { messages: { role: string; body: string }[] };
  console.log(`buyer sees system notices: ${buyerView.messages.filter((m) => m.role === "system").map((m) => m.body).join(" | ")}`);
}

const cat = await v("catalog");
const p = cat.data.products[0];
console.log(`min above list: ${JSON.stringify(await v("catalog", "PATCH", { kind: "product", id: p.id, minPrice: "999999" }))}`);
console.log(`negative price: ${JSON.stringify(await v("catalog", "PATCH", { kind: "product", id: p.id, listPrice: "-5" }))}`);
console.log(`http video url: ${JSON.stringify(await v("catalog", "PATCH", { kind: "product", id: p.id, videoUrl: "javascript:alert(1)" }))}`);
console.log(`settings bad mode: ${JSON.stringify(await v("settings", "PATCH", { replyMode: "yolo" }))}`);
console.log(`settings unknown field: ${JSON.stringify(await v("settings", "PATCH", { currency: "USD" }))}`);
console.log(`settings save tagline: ${(await v("settings", "PATCH", { tagline: "Celebration cakes and small chops in Lagos" })).status}`);
