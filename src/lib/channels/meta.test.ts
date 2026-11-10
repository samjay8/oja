import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { chunkText, parseMetaWebhook, verifyMetaSignature } from "./meta";

describe("parseMetaWebhook", () => {
  it("reads WhatsApp text, buttons and contact names; skips media and duplicates", () => {
    const msgs = parseMetaWebhook({
      object: "whatsapp_business_account",
      entry: [{
        id: "WABA",
        changes: [{
          field: "messages",
          value: {
            metadata: { phone_number_id: "1234567890" },
            contacts: [{ wa_id: "2348000000000", profile: { name: "Ada" } }],
            messages: [
              { from: "2348000000000", id: "wamid.1", timestamp: "1", type: "text", text: { body: "How much?" } },
              { from: "2348000000000", id: "wamid.1", timestamp: "1", type: "text", text: { body: "How much?" } },
              { from: "2348000000000", id: "wamid.2", timestamp: "1", type: "button", button: { text: "Yes" } },
              { from: "2348000000000", id: "wamid.3", timestamp: "1", type: "image" },
            ],
          },
        }],
      }],
    });
    expect(msgs).toEqual([
      { channel: "whatsapp", externalId: "1234567890", senderId: "2348000000000", senderName: "Ada", messageId: "wamid.1", text: "How much?" },
      { channel: "whatsapp", externalId: "1234567890", senderId: "2348000000000", senderName: "Ada", messageId: "wamid.2", text: "Yes" },
    ]);
  });

  it("reads Messenger messages, skipping echoes, attachments and duplicates", () => {
    const msgs = parseMetaWebhook({
      object: "page",
      entry: [{
        id: "111222333",
        time: 1,
        messaging: [
          { sender: { id: "PSID1" }, recipient: { id: "111222333" }, message: { mid: "m_1", text: "Hi" } },
          { sender: { id: "PSID1" }, recipient: { id: "111222333" }, message: { mid: "m_1", text: "Hi" } },
          { sender: { id: "111222333" }, recipient: { id: "PSID1" }, message: { mid: "m_2", text: "Hello!", is_echo: true } },
          { sender: { id: "PSID1" }, recipient: { id: "111222333" }, message: { mid: "m_3", attachments: [{ type: "image" }] } },
          { sender: { id: "PSID1" }, recipient: { id: "111222333" }, read: { watermark: 1 } },
        ],
      }],
    });
    expect(msgs).toEqual([{ channel: "messenger", externalId: "111222333", senderId: "PSID1", messageId: "m_1", text: "Hi" }]);
  });

  it("reads Instagram messages and falls back to recipient id", () => {
    const msgs = parseMetaWebhook({
      object: "instagram",
      entry: [{
        messaging: [
          { sender: { id: "IGSID9" }, recipient: { id: "17841400000000" }, message: { mid: "ig_1", text: "Price?" } },
          { sender: { id: "17841400000000" }, recipient: { id: "IGSID9" }, message: { mid: "ig_2", text: "₦15,000", is_echo: true } },
        ],
      }],
    });
    expect(msgs).toEqual([{ channel: "instagram", externalId: "17841400000000", senderId: "IGSID9", messageId: "ig_1", text: "Price?" }]);
  });

  it("ignores unknown objects and junk", () => {
    expect(parseMetaWebhook({ object: "user", entry: [] })).toEqual([]);
    expect(parseMetaWebhook(null)).toEqual([]);
    expect(parseMetaWebhook({ object: "page", entry: "nope" })).toEqual([]);
  });
});

describe("verifyMetaSignature", () => {
  const raw = JSON.stringify({ object: "page", entry: [] });
  const sign = (body: string, secret: string) => `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

  it("accepts the right signature", () => {
    expect(verifyMetaSignature(raw, sign(raw, "s3cret"), "s3cret")).toBe(true);
  });

  it("rejects wrong secret, tampered body, bad format and missing secret", () => {
    expect(verifyMetaSignature(raw, sign(raw, "other"), "s3cret")).toBe(false);
    expect(verifyMetaSignature(raw + " ", sign(raw, "s3cret"), "s3cret")).toBe(false);
    expect(verifyMetaSignature(raw, "sha256=zz", "s3cret")).toBe(false);
    expect(verifyMetaSignature(raw, null, "s3cret")).toBe(false);
    expect(verifyMetaSignature(raw, sign(raw, "s3cret"), "")).toBe(false);
  });
});

describe("chunkText", () => {
  it("leaves short text alone", () => {
    expect(chunkText("Hello there.", 1000)).toEqual(["Hello there."]);
  });

  it("splits at sentence boundaries within the limit", () => {
    const s = "This is sentence one. This is sentence two. This is sentence three.";
    const parts = chunkText(s, 45);
    expect(parts).toEqual(["This is sentence one. This is sentence two.", "This is sentence three."]);
    parts.forEach((p) => expect(p.length).toBeLessThanOrEqual(45));
  });

  it("falls back to spaces, then hard cuts", () => {
    const words = Array.from({ length: 50 }, (_, i) => `word${i}`).join(" ");
    const parts = chunkText(words, 40);
    parts.forEach((p) => expect(p.length).toBeLessThanOrEqual(40));
    expect(parts.join(" ")).toBe(words);
    const blob = "x".repeat(2500);
    expect(chunkText(blob, 1000).map((p) => p.length)).toEqual([1000, 1000, 500]);
  });
});
