import { beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

vi.mock("server-only", () => ({}));

import { openMemoryDb, type DB } from "@/db";
import { seed, DEMO_SLUG, DEMO_NGN_SLUG } from "@/db/seed";
import { events, products } from "@/db/schema";
import {
  confirmPayPalPayment, getOrCreateConversation, makeOffer, markShipped, placeOrder,
  vendorBySlug, vendorConfirmTransfer, type Vendor,
} from "./commerce";

let db: DB;
let vendor: Vendor;

const shipTo = { name: "Ada Obi", line1: "10 Downing Close", city: "London", postalCode: "E1 6AN", country: "GB" };

beforeAll(async () => {
  db = await openMemoryDb();
  await seed(db, { vendorKey: "test-key" });
  vendor = (await vendorBySlug(db, DEMO_SLUG))!;
}, 60_000);

async function productNamed(name: string) {
  return (await db.select().from(products).where(eq(products.name, name)))[0];
}

describe("checkout charges what code agreed, not what anyone typed", () => {
  it("haggles, checks out at the agreed price, captures, ships", async () => {
    const conv = await getOrCreateConversation(db, vendor.id, "web", "buyer-1");
    const adire = await productNamed("Adire two-piece (indigo)");

    const first = await makeOffer(db, { vendor, conv, productId: adire.id, qty: 2, buyerOfferMinor: 5000 });
    expect(first.decision.decision).toBe("counter");
    expect(first.decision.unitPriceMinor).toBeGreaterThanOrEqual(adire.minPriceMinor);

    const deal = await makeOffer(db, { vendor, conv, productId: adire.id, qty: 2, buyerOfferMinor: 7600 });
    // Keep haggling until code accepts.
    let d = deal.decision;
    while (d.decision !== "accept") d = (await makeOffer(db, { vendor, conv, productId: adire.id, qty: 2, buyerOfferMinor: 7600 })).decision;
    const agreed = d.unitPriceMinor;
    expect(agreed).toBeGreaterThanOrEqual(adire.minPriceMinor);

    const createCheckout = vi.fn(async () => ({ paypalOrderId: "5O190127TN364715T", approveUrl: "https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T" }));
    const order = await placeOrder(db, { createCheckout, baseUrl: "http://localhost:3000" }, {
      vendor, conv, items: [{ productId: adire.id, qty: 2 }], shipTo,
    });
    expect(order.rail).toBe("paypal");
    expect(order.lines[0].unitPriceMinor).toBe(agreed);
    expect(order.shippingMinor).toBe(3800); // GB zone
    expect(order.totalMinor).toBe(agreed * 2 + 3800);
    expect(createCheckout).toHaveBeenCalledWith(expect.objectContaining({ shippingMinor: 3800, currency: "USD" }));

    const capture = vi.fn(async () => ({
      captureId: "3C679366HH908993F", amountMinor: order.totalMinor, currency: "USD",
      shipTo: { name: "Ada Obi", line1: "22 Other Road", city: "London", country: "GB" },
    }));
    const paid = await confirmPayPalPayment(db, capture, order.ref);
    expect(paid.status).toBe("paid");
    expect(paid.shipTo.line1).toBe("22 Other Road"); // address on the PayPal transaction wins

    // Idempotent: reloading the return page doesn't capture twice.
    await confirmPayPalPayment(db, capture, order.ref);
    expect(capture).toHaveBeenCalledTimes(1);

    const addTracking = vi.fn(async () => ({}));
    const shipped = await markShipped(db, { addTracking }, vendor.id, order.id, "JD014600006281234567");
    expect(shipped.status).toBe("shipped");
    expect(addTracking).toHaveBeenCalledWith({ captureId: "3C679366HH908993F", trackingNumber: "JD014600006281234567", carrier: "DHL Express" });

    const stock = (await productNamed("Adire two-piece (indigo)")).stock;
    expect(stock).toBe(10);
  });

  it("refuses to mark paid when the captured amount doesn't match", async () => {
    const conv = await getOrCreateConversation(db, vendor.id, "web", "buyer-2");
    const gele = await productNamed("Aso-oke gele and ipele set");
    const order = await placeOrder(db, {
      createCheckout: async () => ({ paypalOrderId: "6O190127TN364715T", approveUrl: "https://www.sandbox.paypal.com/checkoutnow?token=6O" }),
      baseUrl: "http://x",
    }, { vendor, conv, items: [{ productId: gele.id, qty: 1 }], shipTo });
    await expect(confirmPayPalPayment(db, async () => ({ captureId: "X1", amountMinor: 100, currency: "USD" }), order.ref)).rejects.toThrow(/didn't match/);
    const ev = await db.select().from(events).where(eq(events.type, "payment.amount_mismatch"));
    expect(ev).toHaveLength(1);
  });

  it("refuses to capture when PayPal's order amount differs, before any money moves", async () => {
    const conv = await getOrCreateConversation(db, vendor.id, "web", "buyer-pre");
    const gele = await productNamed("Aso-oke gele and ipele set");
    const order = await placeOrder(db, {
      createCheckout: async () => ({ paypalOrderId: "8O190127TN364715T", approveUrl: "https://www.sandbox.paypal.com/checkoutnow?token=8O" }),
      baseUrl: "http://x",
    }, { vendor, conv, items: [{ productId: gele.id, qty: 1 }], shipTo });
    const capture = vi.fn();
    await expect(confirmPayPalPayment(db, capture, order.ref, async () => ({ amountMinor: 1, currency: "USD" }))).rejects.toThrow(/Nothing was charged/);
    expect(capture).not.toHaveBeenCalled();
  });

  it("uses bulk tiers for aso-ebi group orders", async () => {
    const conv = await getOrCreateConversation(db, vendor.id, "web", "buyer-3");
    const fabric = await productNamed("Aso-ebi adire fabric (per 5-yard piece)");
    const order = await placeOrder(db, {
      createCheckout: async () => ({ paypalOrderId: "7O190127TN364715T", approveUrl: "https://www.sandbox.paypal.com/x" }), baseUrl: "http://x",
    }, { vendor, conv, items: [{ productId: fabric.id, qty: 30 }], shipTo: { ...shipTo, country: "US", city: "Houston" } });
    expect(order.lines[0].unitPriceMinor).toBe(2400);
    expect(order.etaDaysMin).toBe(5 + 5); // US zone + making time
  });

  it("naira shop uses the vendor-confirmed bank transfer rail", async () => {
    const tolu = (await vendorBySlug(db, DEMO_NGN_SLUG))!;
    const conv = await getOrCreateConversation(db, tolu.id, "web", "buyer-4");
    const cake = (await db.select().from(products).where(eq(products.vendorId, tolu.id)))[0];
    const createCheckout = vi.fn();
    const order = await placeOrder(db, { createCheckout, baseUrl: "http://x" }, {
      vendor: tolu, conv, items: [{ productId: cake.id, qty: 1 }], shipTo: { name: "B", line1: "1 Allen Ave", city: "Lagos", country: "NG" },
    });
    expect(order.rail).toBe("bank_transfer");
    expect(createCheckout).not.toHaveBeenCalled();
    const paid = await vendorConfirmTransfer(db, tolu.id, order.id);
    expect(paid.status).toBe("paid");
    await expect(vendorConfirmTransfer(db, vendor.id, order.id)).rejects.toThrow(); // other vendor can't
  });
});
