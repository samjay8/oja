// GET /api/chat is what every open chat polls; check its shape on the cheap path.
import { beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));
process.env.PGLITE_DIR = "memory";
process.env.SEED_DEMO = "1";

import { getDb } from "@/db";
import { DEMO_SLUG } from "@/db/seed";
import { conversations } from "@/db/schema";
import { addMessage, getOrCreateConversation, vendorBySlug } from "@/lib/commerce";
import { eq } from "drizzle-orm";
import { GET } from "./route";

const get = async (qs: string) => {
  const r = await GET(new NextRequest(`http://localhost/api/chat?${qs}`));
  return { status: r.status, body: await r.json() };
};

beforeAll(async () => { await getDb(); }, 60_000);

describe("GET /api/chat", () => {
  it("rejects a bad session and an unknown shop", async () => {
    expect((await get(`shop=${DEMO_SLUG}&session=short`)).status).toBe(400);
    expect((await get("shop=nope&session=abcdefghijklmnop0000")).status).toBe(404);
  });

  it("returns an empty chat when there is no conversation yet", async () => {
    expect(await get(`shop=${DEMO_SLUG}&session=abcdefghijklmnop0001`))
      .toEqual({ status: 200, body: { messages: [], sellerReviewing: false, language: null } });
  });

  it("shows sent messages only and flags drafts / needs-human as seller reviewing", async () => {
    const db = await getDb();
    const vendor = (await vendorBySlug(db, DEMO_SLUG))!;
    const conv = await getOrCreateConversation(db, vendor.id, "web", "abcdefghijklmnop0002");
    await addMessage(db, conv.id, "buyer", "hello");
    await addMessage(db, conv.id, "agent", "hi there");
    let r = await get(`shop=${DEMO_SLUG}&session=abcdefghijklmnop0002`);
    expect(r.body.messages.map((m: { body: string }) => m.body)).toEqual(["hello", "hi there"]);
    expect(Object.keys(r.body.messages[0]).sort()).toEqual(["at", "body", "id", "role"]);
    expect(r.body.sellerReviewing).toBe(false);

    await addMessage(db, conv.id, "agent", "draft reply", { status: "draft" });
    r = await get(`shop=${DEMO_SLUG}&session=abcdefghijklmnop0002`);
    expect(r.body.messages).toHaveLength(2);
    expect(r.body.sellerReviewing).toBe(true);

    await addMessage(db, conv.id, "agent", "gone", { status: "discarded" });
    await addMessage(db, conv.id, "buyer", "anyone?");
    await db.update(conversations).set({ needsHuman: true, language: "yo" }).where(eq(conversations.id, conv.id));
    r = await get(`shop=${DEMO_SLUG}&session=abcdefghijklmnop0002`);
    expect(r.body.messages.map((m: { body: string }) => m.body)).toEqual(["hello", "hi there", "anyone?"]);
    expect(r.body.sellerReviewing).toBe(true);
    expect(r.body.language).toBe("yo");
  });
});
