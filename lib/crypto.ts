import crypto from "node:crypto";

/**
 * OAuth tokenlarini DB'da shifrlash uchun AES-256-GCM (app-level).
 * ENCRYPTION_KEY — 32-bayt kalit, hex (64 belgilik). Yaratish: openssl rand -hex 32.
 * Format: `iv(hex):tag(hex):ciphertext(hex)`.
 */

const ALGO = "aes-256-gcm";
const IV_LEN = 12; // GCM uchun tavsiya etilgan

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY 32-bayt hex (64 belgilik) bo'lishi kerak. Yaratish: openssl rand -hex 32",
    );
  }
  return Buffer.from(hex, "hex");
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function decrypt(payload: string): string {
  const key = getKey();
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("Yaroqsiz shifrlangan qiymat formati");
  }
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}
