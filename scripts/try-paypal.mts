// Create a real PayPal sandbox order through Oja's checkout code and read it back.
//   pnpm try-paypal
// Prints the approve link. Approving it needs the app running (return URL) to capture.

import { config } from "dotenv";
config({ path: ".env.local" });

const { openMemoryDb } = await import("../src/db");
const { seed, DEMO_SLUG } = await import("../src/db/seed");
const { getOrCreateConversation, makeOffer, placeOrder, searchCatalog, vendorBySlug } = await import("../src/lib/commerce");
const { createCheckout, getOrder } = await import("../src/lib/paypal");

const db = await openMemoryDb();
await seed(db, { vendorKey: "local" });
const vendor = (await vendorBySlug(db, DEMO_SLUG))!;
const conv = await getOrCreateConversation(db, vendor.id, "web", "paypal-test-buyer");
const adire = (await searchCatalog(db, vendor.id, "adire two-piece"))[0];

let d = (await makeOffer(db, { vendor, conv, productId: adire.id, qty: 1, buyerOfferMinor: 7600 })).decision;
while (d.decision !== "accept") d = (await makeOffer(db, { vendor, conv, productId: adire.id, qty: 1, buyerOfferMinor: 7600 })).decision;
console.log(`agreed ${adire.name} at ${d.unitPriceMinor / 100} (list ${adire.listPriceMinor / 100}, floor ${adire.minPriceMinor / 100})`);

const t0 = Date.now();
const order = await placeOrder(db, { createCheckout, baseUrl: process.env.APP_URL || "http://localhost:3000" }, {
  vendor, conv, items: [{ productId: adire.id, qty: 1 }],
  shipTo: { name: "Ada Obi", line1: "10 Downing Close", city: "London", postalCode: "E1 6AN", country: "GB" },
});
console.log(`order ${order.ref}: total ${order.totalMinor / 100} ${order.currency} (shipping ${order.shippingMinor / 100}) in ${Date.now() - t0}ms`);
console.log(`paypal order ${order.paypalOrderId}`);
console.log(`approve: ${order.paypalApproveUrl}`);

const pp = await getOrder(order.paypalOrderId!) as unknown as { status: string; purchase_units: { amount: { value: string; currency_code: string }; payee?: { email_address?: string; merchant_id?: string } }[] };
const u = pp.purchase_units[0];
console.log(`paypal says: status=${pp.status} amount=${u.amount.value} ${u.amount.currency_code} payee=${u.payee?.email_address ?? u.payee?.merchant_id ?? "?"}`);
console.log(Number(u.amount.value) * 100 === order.totalMinor ? "AMOUNT MATCHES" : "AMOUNT MISMATCH");
process.exit(0);
