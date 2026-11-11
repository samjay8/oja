// Approve a sandbox PayPal checkout as the sandbox buyer, then follow the redirect back.
//   tsx scripts/audit/paypal-approve.mts <approve-url> [screenshot-dir]
// Buyer login comes from PAYPAL_BUYER_EMAIL / PAYPAL_BUYER_PASSWORD (README sandbox buyer).

import { chromium } from "playwright";

const url = process.argv[2];
const out = process.argv[3] ?? "docs/audit";
const email = process.env.PAYPAL_BUYER_EMAIL!;
const password = process.env.PAYPAL_BUYER_PASSWORD!;
if (!url || !email || !password) throw new Error("usage: approve-url, PAYPAL_BUYER_EMAIL, PAYPAL_BUYER_PASSWORD");

const browser = await chromium.launch({ headless: process.env.HEADED !== "1" });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const shot = (n: string) => page.screenshot({ path: `${out}/${n}.png` });
const step = (s: string) => console.log(`[paypal] ${s} @ ${page.url().split("?")[0]}`);

await page.goto(url, { waitUntil: "domcontentloaded" });
step("opened");

const emailBox = page.locator("#email");
await emailBox.waitFor({ timeout: 45_000 });
await emailBox.fill(email);
const next = page.locator("#btnNext");
if (await next.isVisible().catch(() => false)) await next.click();
const pw = page.locator("#password");
await pw.waitFor({ timeout: 30_000 });
await pw.fill(password);
await page.locator("#btnLogin").click();
step("logged in");

// Review page: the pay / continue button has changed names over time.
const pay = page.locator([
  "[data-testid='submit-button-initial']", "#payment-submit-btn", "button:has-text('Complete Purchase')",
  "button:has-text('Pay Now')", "button:has-text('Continue to Review Order')", "button:has-text('Continue')",
].join(", ")).first();
await pay.waitFor({ timeout: 60_000 });
// Funding sources load after the button appears; clicking early fails.
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(4000);
await shot("paypal-review");
await pay.click();
step("approved");

await page.waitForURL((u) => u.hostname === "localhost" || u.pathname.includes("genericError"), { timeout: 90_000 });
if (page.url().includes("genericError")) {
  const code = new URL(page.url()).searchParams.get("code") ?? "";
  console.log(`[paypal] PayPal error page: ${Buffer.from(code, "base64").toString("utf8") || code}`);
  await shot("paypal-error");
  await browser.close();
  process.exit(2);
}
await page.waitForLoadState("networkidle").catch(() => {});
step("back at shop");
console.log(`[paypal] final ${page.url()}`);
await shot("paypal-return-chat");
await browser.close();
