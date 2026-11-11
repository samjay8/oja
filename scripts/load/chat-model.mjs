// N buyers send one message each at the same moment (POST /api/chat = real model calls,
// real money). Keep N small. Prints latency and outcome per wave.
//   node scripts/load/chat-model.mjs --base http://localhost:3102 --waves 1,5,10,20
import { randomBytes } from "node:crypto";
import { appendFileSync } from "node:fs";

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const base = opt("base", "http://localhost:3102");
const shop = opt("shop", "ife-textiles");
const waves = opt("waves", "1,5,10,20").split(",").map(Number);
const out = opt("out");
const texts = [
  "Hi, how much is the indigo adire wrapper?",
  "Do you deliver to London? What does it cost?",
  "What fabrics do you have under 50 pounds?",
  "Can I get two aso-oke pieces cheaper?",
];

for (const n of waves) {
  const t0 = Date.now();
  const results = await Promise.all(Array.from({ length: n }, async (_, i) => {
    const s = Date.now();
    try {
      const r = await fetch(`${base}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": `10.9.${n}.${i}` },
        body: JSON.stringify({ shop, session: `loadmodel-${randomBytes(10).toString("hex")}`, text: texts[i % texts.length] }),
        signal: AbortSignal.timeout(120_000),
      });
      const body = await r.json().catch(() => ({}));
      const replied = r.ok && body.messages?.at(-1)?.role === "agent";
      return { ms: Date.now() - s, status: r.status, replied, reviewing: !!body.sellerReviewing };
    } catch (e) {
      return { ms: Date.now() - s, status: 0, replied: false, error: String(e) };
    }
  }));
  const ms = results.map((r) => r.ms).sort((a, b) => a - b);
  const summary = {
    buyers: n, wallMs: Date.now() - t0,
    p50: ms[Math.floor(ms.length / 2)], max: ms.at(-1),
    replied: results.filter((r) => r.replied).length,
    sellerReviewing: results.filter((r) => r.reviewing).length,
    statuses: results.reduce((a, r) => ({ ...a, [r.status]: (a[r.status] ?? 0) + 1 }), {}),
  };
  console.log(JSON.stringify(summary));
  if (out) appendFileSync(out, JSON.stringify(summary) + "\n");
}
