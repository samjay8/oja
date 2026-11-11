// Seeds N web conversations of ~10 messages each for the "chat-seeded" scenario, and
// writes their session ids (one per line) to --sessions.
// ONLY run against a throwaway database: a Neon branch (DATABASE_URL), or a local PGlite
// directory (PGLITE_DIR) while the app server is stopped (run the app once first so the
// tables exist).
//   node scripts/load/seed-conversations.mjs --n 200 --sessions sessions.txt
//   node scripts/load/seed-conversations.mjs --clean     (removes them again)

import { writeFileSync } from "node:fs";

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const n = Number(opt("n", 200));
const shop = opt("shop", "ife-textiles");

// q(text, params) -> rows, over postgres-js or PGlite.
let q, end;
if (process.env.DATABASE_URL) {
  const { default: postgres } = await import("postgres");
  const sql = postgres(process.env.DATABASE_URL, { max: 4, prepare: false });
  q = (text, params = []) => sql.unsafe(text, params);
  end = () => sql.end();
} else if (process.env.PGLITE_DIR) {
  const { PGlite } = await import("@electric-sql/pglite");
  const pg = new PGlite(process.env.PGLITE_DIR);
  q = async (text, params = []) => (await pg.query(text, params)).rows;
  end = () => pg.close();
} else throw new Error("set DATABASE_URL (a throwaway branch) or PGLITE_DIR");

const [vendor] = await q("select id from vendors where slug = $1", [shop]);
if (!vendor) throw new Error(`no shop ${shop}`);

if (argv.includes("--clean")) {
  const r = await q("delete from conversations where vendor_id = $1 and buyer_ref like 'loadseed-%' returning id", [vendor.id]);
  console.log(`removed ${r.length} conversations`);
  await end();
  process.exit(0);
}

const lines = [
  ["buyer", "Hi, do you have the indigo adire wrapper?"],
  ["agent", "Yes! The indigo adire wrapper is in stock. Would you like one or more?"],
  ["buyer", "How much for two?"],
  ["agent", "Two wrappers come to a lower per-piece price. Shall I hold that for you?"],
  ["buyer", "Can you do a bit less?"],
  ["agent", "I can offer a small discount on two. Where should we deliver?"],
  ["buyer", "Lagos, Lekki"],
  ["agent", "Delivery to Lagos takes 2-3 days. Shall I prepare your order?"],
  ["buyer", "Yes please"],
  ["agent", "Great. Here is your order summary; tap Pay to complete with PayPal."],
];
const sessions = [];
for (let i = 0; i < n; i++) {
  const ref = `loadseed-${String(i).padStart(5, "0")}-${Math.random().toString(36).slice(2, 10)}`;
  sessions.push(ref);
  const [conv] = await q(`insert into conversations (vendor_id, channel, buyer_ref, last_buyer_message_at)
    values ($1, 'web', $2, now() - make_interval(secs => $3)) returning id`, [vendor.id, ref, i]);
  const t0 = Date.now() - 600_000;
  const values = lines.map((_, j) => `($1, $${j * 3 + 2}, $${j * 3 + 3}, 'sent', $${j * 3 + 4})`).join(", ");
  const params = [conv.id, ...lines.flatMap(([role, body], j) => [role, body, new Date(t0 + j * 30_000).toISOString()])];
  await q(`insert into messages (conversation_id, role, body, status, created_at) values ${values}`, params);
}
writeFileSync(opt("sessions", "sessions.txt"), sessions.join("\n") + "\n");
console.log(`seeded ${n} conversations x ${lines.length} messages`);
await end();
