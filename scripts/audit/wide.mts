// Which elements stick out past the viewport: tsx scripts/audit/wide.mts <path-without-leading-slash>
import { chromium } from "playwright";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 375, height: 812 } });
await ctx.request.post("http://localhost:3100/api/vendor/ife-textiles/login", { data: { key: "oja-demo-2026" }, headers: { "x-forwarded-for": "10.99.0.8" } });
const p = await ctx.newPage();
await p.goto(`http://localhost:3100/${process.argv[2]}`, { waitUntil: "networkidle" });
await p.waitForTimeout(1500);
console.log("scrollWidth", await p.evaluate(() => document.documentElement.scrollWidth));
console.log(await p.evaluate(() => {
  const out: string[] = [];
  for (const el of document.querySelectorAll<HTMLElement>("body *")) {
    const r = el.getBoundingClientRect();
    if (r.right <= innerWidth + 1) continue;
    let clipped = false;
    for (let a = el.parentElement; a; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o === "auto" || o === "hidden" || o === "scroll" || o === "clip") { clipped = true; break; } }
    if (!clipped || r.right > 2000) out.push(`${getComputedStyle(el).position} ${el.tagName.toLowerCase()} right=${Math.round(r.right)} w=${Math.round(r.width)} cls=${String(el.className).slice(0, 90)}`);
  }
  return out.slice(0, 8).join("\n");
}));
await b.close();
