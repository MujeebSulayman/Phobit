import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { env } from "./env";

function hexKey(hex: string, name: string): Buffer {
  const key = Buffer.from(hex, "hex");
  if (key.length < 32) throw new Error(`${name} must be at least 32 bytes of hex`);
  return key;
}

let treasury: Keypair | null = null;
export function treasuryKeypair(): Keypair {
  if (treasury) return treasury;
  const raw = env.treasurySecret().trim();
  const bytes = raw.startsWith("[") ? Uint8Array.from(JSON.parse(raw)) : bs58.decode(raw);
  treasury = Keypair.fromSecretKey(bytes);
  return treasury;
}

/** AES-256-GCM, "iv.tag.ciphertext" in base64url. */
export function encrypt(plain: string): string {
  const key = hexKey(env.cardEncryptionKey(), "CARD_ENCRYPTION_KEY").subarray(0, 32);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64url")).join(".");
}

export function decrypt(sealed: string): string {
  const key = hexKey(env.cardEncryptionKey(), "CARD_ENCRYPTION_KEY").subarray(0, 32);
  const [iv, tag, data] = sealed.split(".").map((p) => Buffer.from(p, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
