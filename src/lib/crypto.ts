// AES-256-GCM for channel access tokens at rest. Key derived from SESSION_SECRET
// (or TOKEN_ENCRYPTION_KEY if set), so a database leak alone doesn't expose tokens.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function key() {
  const secret = process.env.TOKEN_ENCRYPTION_KEY || process.env.SESSION_SECRET;
  if (!secret && process.env.NODE_ENV === "production") throw new Error("TOKEN_ENCRYPTION_KEY or SESSION_SECRET is required");
  return createHash("sha256").update(`oja-token:${secret ?? "dev-only-secret"}`).digest();
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
}

export function decrypt(token: string): string {
  const [v, iv, tag, body] = token.split(".");
  if (v !== "v1" || !iv || !tag || !body) throw new Error("bad ciphertext");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(body, "base64url")), d.final()]).toString("utf8");
}

/** "EAAG…x9Qz" for display. */
export function mask(secret: string) {
  return secret.length <= 8 ? "••••" : `${secret.slice(0, 4)}…${secret.slice(-4)}`;
}
