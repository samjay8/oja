// One load scenario with autocannon. Prints a JSON summary line (and appends it to --out).
//
//   node scripts/load/bench.mjs --base http://localhost:3102 --scenario chat-new -c 200 -d 30
//
// Scenarios:
//   home         GET /
//   shop         GET /shop/ife-textiles
//   chat-new     GET /api/chat with a fresh random session per request (no conversation)
//   chat-seeded  GET /api/chat for sessions listed in --sessions (seed-conversations.mjs)
//   inbox        GET /api/vendor/ife-textiles/inbox with --cookie (signed-in seller)
//
// Options: --pid <server pid> samples RSS/CPU (Windows/Linux) · --label text · --out file.jsonl
// autocannon is not a project dependency: `npm i --prefix .load-deps autocannon@8` and set
// AUTOCANNON_DIR=.load-deps (or install it globally).

import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith("-")) acc.push([a.replace(/^-+/, ""), all[i + 1]?.startsWith("-") || all[i + 1] === undefined ? "1" : all[i + 1]]);
  return acc;
}, []));
const req = createRequire(path.join(path.resolve(process.env.AUTOCANNON_DIR ?? "."), "noop.js"));
const autocannon = req("autocannon");

const base = args.base ?? "http://localhost:3102";
const scenario = args.scenario ?? "home";
const connections = Number(args.c ?? 50);
const duration = Number(args.d ?? 30);
const shop = args.shop ?? "ife-textiles";
const sessions = args.sessions ? readFileSync(args.sessions, "utf8").split(/\r?\n/).filter(Boolean) : [];
let n = 0;

const paths = {
  home: () => "/",
  shop: () => `/shop/${shop}`,
  "chat-new": () => `/api/chat?shop=${shop}&session=load-${randomBytes(12).toString("hex")}`,
  "chat-seeded": () => `/api/chat?shop=${shop}&session=${sessions[n++ % sessions.length]}`,
  inbox: () => `/api/vendor/${shop}/inbox`,
};
if (!paths[scenario]) throw new Error(`unknown scenario ${scenario}`);

function sample(pid) {
  if (!pid) return null;
  try {
    if (process.platform === "win32") {
      const out = execFileSync("powershell", ["-NoProfile", "-Command", `$p=Get-Process -Id ${pid}; "$($p.WorkingSet64) $($p.TotalProcessorTime.TotalSeconds)"`], { encoding: "utf8" }).trim();
      const [rss, cpu] = out.split(" ").map(Number);
      return { rss, cpu };
    }
    const [rssKb, ...rest] = execFileSync("ps", ["-o", "rss=,time=", "-p", String(pid)], { encoding: "utf8" }).trim().split(/\s+/);
    const [h, m, s] = rest[0].split(":").map(Number);
    return { rss: Number(rssKb) * 1024, cpu: h * 3600 + m * 60 + s };
  } catch { return null; }
}

const lat = [];
const codes = {};
const pid = args.pid ? Number(args.pid) : null;
const start = sample(pid);
let peakRss = start?.rss ?? 0;
const sampler = pid ? setInterval(() => { const s = sample(pid); if (s) peakRss = Math.max(peakRss, s.rss); }, 3000) : null;

const inst = autocannon({
  url: base,
  connections,
  duration,
  timeout: Number(args.timeout ?? 20),
  headers: args.cookie ? { cookie: args.cookie } : {},
  requests: [{ method: "GET", setupRequest: (r) => ({ ...r, path: paths[scenario]() }) }],
});
inst.on("response", (_c, status, _bytes, ms) => { lat.push(ms); codes[status] = (codes[status] ?? 0) + 1; });

inst.on("done", (r) => {
  if (sampler) clearInterval(sampler);
  const end = sample(pid);
  lat.sort((a, b) => a - b);
  const pct = (p) => (lat.length ? Math.round(lat[Math.min(lat.length - 1, Math.floor((p / 100) * lat.length))]) : null);
  const ok = codes[200] ?? 0;
  const total = r.requests.total + r.errors; // errors = timeouts + socket errors (no response)
  const summary = {
    label: args.label ?? "",
    base, scenario, connections, duration,
    reqPerSec: Math.round((r.requests.total / duration) * 10) / 10,
    okPerSec: Math.round((ok / duration) * 10) / 10,
    p50: pct(50), p95: pct(95), p99: pct(99), max: lat.at(-1) ? Math.round(lat.at(-1)) : null,
    responses: r.requests.total, codes, errors: r.errors, timeouts: r.timeouts,
    errorRate: total ? Math.round(((total - ok) / total) * 1000) / 10 : 0,
    peakRssMB: peakRss ? Math.round(peakRss / 1048576) : null,
    avgCpuCores: start && end ? Math.round(((end.cpu - start.cpu) / duration) * 100) / 100 : null,
    at: new Date().toISOString(),
  };
  console.log(JSON.stringify(summary));
  if (args.out) appendFileSync(args.out, JSON.stringify(summary) + "\n");
});
