import { describe, expect, it } from "vitest";
import { channelLink, isValidHandle, normalizeHandle } from "./links";

describe("channelLink", () => {
  it("builds wa.me links with an encoded prefilled message", () => {
    expect(channelLink("whatsapp", "2348012345678")).toBe("https://wa.me/2348012345678");
    expect(channelLink("whatsapp", "2348012345678", { text: "Hi Ifẹ́ Textiles, I'm interested in…" }))
      .toBe(`https://wa.me/2348012345678?text=${encodeURIComponent("Hi Ifẹ́ Textiles, I'm interested in…")}`);
    expect(channelLink("whatsapp", "2348012345678", { text: "   " })).toBe("https://wa.me/2348012345678");
  });

  it("builds m.me and ig.me links", () => {
    expect(channelLink("messenger", "ife.textiles")).toBe("https://m.me/ife.textiles");
    expect(channelLink("messenger", "104857392011")).toBe("https://m.me/104857392011");
    expect(channelLink("instagram", "ife_textiles.ng")).toBe("https://ig.me/m/ife_textiles.ng");
  });

  it("returns null for anything that isn't a clean handle", () => {
    for (const bad of [null, undefined, "", "+2348012345678", "234 801", "123456", "1234567890123456", "0123456789"]) {
      expect(channelLink("whatsapp", bad)).toBeNull();
    }
    for (const bad of ["", "ife textiles", "ife_textiles", "a/b", "x".repeat(51), "javascript:alert(1)"]) {
      expect(channelLink("messenger", bad)).toBeNull();
    }
    for (const bad of ["", "@ife", "ife-textiles", "x".repeat(31), "a?b=c", "../x"]) {
      expect(channelLink("instagram", bad)).toBeNull();
    }
  });
});

describe("normalizeHandle", () => {
  it("strips formatting a seller is likely to type", () => {
    expect(normalizeHandle("whatsapp", "+234 801-234 5678")).toBe("2348012345678");
    expect(normalizeHandle("whatsapp", "(234) 801.234.5678")).toBe("2348012345678");
    expect(normalizeHandle("whatsapp", "002348012345678")).toBe("2348012345678");
    expect(normalizeHandle("instagram", " @ife_textiles ")).toBe("ife_textiles");
    expect(normalizeHandle("messenger", "@IfeTextiles")).toBe("IfeTextiles");
  });

  it("rejects what can't be fixed", () => {
    expect(normalizeHandle("whatsapp", "call me")).toBeNull();
    expect(normalizeHandle("instagram", "https://instagram.com/ife")).toBeNull();
    expect(isValidHandle("messenger", "ok.page")).toBe(true);
  });
});
