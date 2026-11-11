// One screenshot: tsx scripts/audit/shot.mts <path-without-leading-slash> <out.png> [width] [dark]
import { chromium } from "playwright";
const [path, out, w = "375", dark] = process.argv.slice(2);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: Number(w), height: 812 }, colorScheme: dark ? "dark" : "light" });
await ctx.request.post(`${process.env.BASE ?? "http://localhost:3100"}/api/vendor/ife-textiles/login`, { data: { key: process.env.DEMO_VENDOR_KEY ?? "oja-demo-2026" }, headers: { "x-forwarded-for": "10.99.0.9" } });
const p = await ctx.newPage();
await p.goto(`${process.env.BASE ?? "http://localhost:3100"}/${path}`, { waitUntil: "networkidle" });
await p.waitForTimeout(800);
console.log("overflow", await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth));
await p.screenshot({ path: out });
await b.close();
