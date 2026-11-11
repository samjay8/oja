// Width chain from an element up to <html>: tsx scripts/audit/chain.mts <path> <css-selector>
import { chromium } from "playwright";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 375, height: 812 } });
await ctx.request.post("http://localhost:3100/api/vendor/ife-textiles/login", { data: { key: "oja-demo-2026" }, headers: { "x-forwarded-for": "10.99.0.7" } });
const p = await ctx.newPage();
await p.goto(`http://localhost:3100/${process.argv[2]}`, { waitUntil: "networkidle" });
await p.waitForTimeout(1500);
console.log(await p.evaluate((sel) => {
  const out: string[] = [];
  for (let el = document.querySelector<HTMLElement>(sel); el; el = el.parentElement) {
    const cs = getComputedStyle(el);
    out.push(`${el.tagName.toLowerCase()} w=${Math.round(el.getBoundingClientRect().width)} sw=${el.scrollWidth} ox=${cs.overflowX} disp=${cs.display} cols=${cs.gridTemplateColumns?.slice(0, 30)} cls=${String(el.className).slice(0, 70)}`);
  }
  return out.join("\n");
}, process.argv[3]));
await b.close();
