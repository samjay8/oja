// Positioned elements past the right edge: tsx scripts/audit/abs.mts <path>
import { chromium } from "playwright";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 375, height: 812 } });
await ctx.request.post("http://localhost:3100/api/vendor/ife-textiles/login", { data: { key: "oja-demo-2026" }, headers: { "x-forwarded-for": "10.99.0.6" } });
const p = await ctx.newPage();
await p.goto(`http://localhost:3100/${process.argv[2]}`, { waitUntil: "networkidle" });
await p.waitForTimeout(1500);
console.log(await p.evaluate(() => [...document.querySelectorAll<HTMLElement>("*")]
  .filter((el) => ["absolute", "fixed"].includes(getComputedStyle(el).position) && el.getBoundingClientRect().right > innerWidth + 1)
  .slice(0, 10).map((el) => { const r = el.getBoundingClientRect(); return `${el.tagName.toLowerCase()} ${getComputedStyle(el).position} left=${Math.round(r.left)} right=${Math.round(r.right)} cls=${String(el.className).slice(0, 80)} parent=${String(el.parentElement?.className).slice(0, 60)}`; }).join("\n")));
await b.close();
