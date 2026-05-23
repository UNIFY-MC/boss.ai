// AES-256-GCM wrap for OAuth refresh tokens at rest.
//
// Key comes from CREDS_ENCRYPTION_KEY (64 hex chars = 32 bytes). Generate
// with: openssl rand -hex 32
//
// Ciphertext layout (base64): iv(12) | tag(16) | ciphertext(N)

import crypto from "node:crypto";

const ALGO = "aes-256-gcm";

function loadKey() {
  const hex = (process.env.CREDS_ENCRYPTION_KEY || "").trim();
  if (!hex) throw new Error("CREDS_ENCRYPTION_KEY not set");
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) {
    throw new Error(`CREDS_ENCRYPTION_KEY must be 64 hex chars (got ${hex.length})`);
  }
  return key;
}

export function encryptSecret(plain) {
  const key = loadKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export function decryptSecret(encoded) {
  const key = loadKey();
  const data = Buffer.from(encoded, "base64");
  if (data.length < 28) throw new Error("Ciphertext too short");
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const ciphertext = data.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
