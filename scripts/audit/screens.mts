// Audit screenshots and layout checks: buyer pages and seller desk, 375 and 1280, light and dark.
//   tsx scripts/audit/screens.mts [out-dir]   (BASE defaults to http://localhost:3100)
import { chromium, type Page } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3100";
const OUT = process.argv[2] ?? "docs/audit";
const KEY = process.env.DEMO_VENDOR_KEY ?? "oja-demo-2026";
const SIZES = [{ w: 375, h: 812 }, { w: 1280, h: 800 }];
const PAGES = [
  { name: "landing", path: "/" },
  { name: "shop", path: "/shop/ife-textiles" },
  { name: "shop-ngn", path: "/shop/tolu-cakes" },
  { name: "desk-signin", path: "/vendor/ife-textiles", signedOut: true },
  { name: "desk-inbox", path: "/vendor/ife-textiles" },
  { name: "desk-catalog", path: "/vendor/ife-textiles/catalog" },
  { name: "desk-settings", path: "/vendor/ife-textiles/settings" },
  { name: "desk-channels", path: "/vendor/ife-textiles/channels" },
  { name: "not-found", path: "/nope" },
];

const browser = await chromium.launch();
const problems: string[] = [];

async function check(page: Page, label: string) {
  const r = await page.evaluate(async () => {
    await document.fonts.ready;
    const fams = ["Gloock", "Schibsted Grotesk", "Martian Mono"];
    const loaded = [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/["']/g, ""));
    const wide = [...document.querySelectorAll<HTMLElement>("body *")].filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1 && getComputedStyle(el).position !== "fixed").slice(0, 3).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}`);
    return {
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      wide,
      fonts: fams.map((f) => [f, loaded.some((l) => l.includes(f))]),
      logo: Boolean(document.querySelector("svg")),
    };
  });
  if (r.overflow) problems.push(`${label}: horizontal scroll (${r.wide.join(", ")})`);
  return r;
}

for (const scheme of ["light", "dark"] as const) {
  for (const s of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h }, colorScheme: scheme, reducedMotion: "no-preference" });
    for (const p of PAGES) {
      if (!p.signedOut && p.path.startsWith("/vendor")) {
        await ctx.request.post(`${BASE}/api/vendor/ife-textiles/login`, { data: { key: KEY }, headers: { "x-forwarded-for": `10.88.${s.w % 250}.1` } });
      }
      if (p.signedOut) await ctx.clearCookies();
      const page = await ctx.newPage();
      const errors: string[] = [];
      page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
      page.on("pageerror", (e) => errors.push(`pageerror ${e.message.slice(0, 200)}`));
      await page.goto(BASE + p.path, { waitUntil: "networkidle" });
      await page.waitForTimeout(900);
      const label = `${p.name}-${s.w}-${scheme}`;
      const r = await check(page, label);
      const missing = r.fonts.filter(([, ok]) => !ok).map(([f]) => f);
      if (errors.length) problems.push(`${label}: console ${errors.join(" | ")}`);
      console.log(`${label}: overflow=${r.overflow} fontsMissing=${missing.join("/") || "none"} errors=${errors.length}`);
      await page.screenshot({ path: `${OUT}/${label}.png`, fullPage: p.name === "landing" && s.w === 375 ? false : false });
      await page.close();
    }
    await ctx.close();
  }
}

// Language picker + reduced motion on the shop.
{
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/shop/ife-textiles`, { waitUntil: "networkidle" });
  const anims = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length);
  const durations = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("*")].map((e) => getComputedStyle(e).animationDuration).filter((d) => d && d !== "0s" && !d.startsWith("1e-") && d !== "0.01ms").slice(0, 5));
  console.log(`reduced-motion: running animations=${anims}, non-zero durations sample=${durations.join(",") || "none"}`);
  const picker = page.locator("button[aria-haspopup='listbox']").first();
  await picker.click();
  await page.screenshot({ path: `${OUT}/shop-language-open-375.png` });
  const opts = await page.locator("[role='option']").allTextContents();
  await page.locator("[role='option']", { hasText: /Yorùbá|Yoruba/ }).first().click();
  await page.waitForTimeout(400);
  const lang = await page.evaluate(() => Object.entries(localStorage).filter(([k]) => k.startsWith("oja_lang")));
  console.log(`language picker: ${opts.length} options; stored=${JSON.stringify(lang)}`);
  await page.screenshot({ path: `${OUT}/shop-yoruba-375.png` });
  await ctx.close();
}

console.log(problems.length ? `\nPROBLEMS:\n${problems.join("\n")}` : "\nno layout/console problems");
await browser.close();
