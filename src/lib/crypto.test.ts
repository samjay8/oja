import { describe, expect, it } from "vitest";
import { decrypt, encrypt, mask } from "./crypto";

describe("token encryption", () => {
  it("round-trips and uses a fresh IV each time", () => {
    const token = "EAAGtest-token-1234567890";
    const a = encrypt(token);
    const b = encrypt(token);
    expect(a).not.toBe(b);
    expect(a).not.toContain(token);
    expect(decrypt(a)).toBe(token);
    expect(decrypt(b)).toBe(token);
  });

  it("detects tampering", () => {
    const [v, iv, tag, body] = encrypt("EAAGtest-token-1234567890").split(".");
    const flipped = Buffer.from(body, "base64url");
    flipped[0] ^= 1;
    expect(() => decrypt([v, iv, tag, flipped.toString("base64url")].join("."))).toThrow();
    expect(() => decrypt("v2.a.b.c")).toThrow();
    expect(() => decrypt("garbage")).toThrow();
  });

  it("masks for display", () => {
    expect(mask("EAAGabcdefgh9Qz1")).toBe("EAAG…9Qz1");
    expect(mask("short")).toBe("••••");
  });
});
