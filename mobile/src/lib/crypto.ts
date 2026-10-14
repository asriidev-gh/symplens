import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";

/**
 * Authenticated encryption for data at rest (XChaCha20-Poly1305). Pure functions: the random source is passed in,
 * so this file has no platform dependencies and is unit-tested from the server test suite.
 *
 * Payload format: "enc1:" + base64(nonce[24] || ciphertext || tag[16]). A fresh random nonce is used per write, and
 * any tampering with the payload makes decryption throw instead of returning altered data.
 */
export const KEY_BYTES = 32;
const NONCE_BYTES = 24;
const PREFIX = "enc1:";

export type RandomBytes = (n: number) => Uint8Array;

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const LOOKUP: Record<string, number> = Object.fromEntries([...ALPHABET].map((c, i) => [c, i]));

export function toBase64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += ALPHABET[(n >> 18) & 63] + ALPHABET[(n >> 12) & 63];
    out += i + 1 < bytes.length ? ALPHABET[(n >> 6) & 63] : "=";
    out += i + 2 < bytes.length ? ALPHABET[n & 63] : "=";
  }
  return out;
}

export function fromBase64(text: string): Uint8Array {
  const clean = text.replace(/=+$/, "");
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = LOOKUP[clean[i]];
    const b = LOOKUP[clean[i + 1]];
    const c = clean[i + 2] === undefined ? 0 : LOOKUP[clean[i + 2]];
    const d = clean[i + 3] === undefined ? 0 : LOOKUP[clean[i + 3]];
    if (a === undefined || b === undefined || c === undefined || d === undefined) throw new Error("invalid base64");
    const n = (a << 18) | (b << 12) | (c << 6) | d;
    if (o < out.length) out[o++] = (n >> 16) & 255;
    if (o < out.length) out[o++] = (n >> 8) & 255;
    if (o < out.length) out[o++] = n & 255;
  }
  return out;
}

export const isEncrypted = (text: string): boolean => text.startsWith(PREFIX);

export function encryptString(plain: string, key: Uint8Array, random: RandomBytes): string {
  if (key.length !== KEY_BYTES) throw new Error("bad key length");
  const nonce = random(NONCE_BYTES);
  const sealed = xchacha20poly1305(key, nonce).encrypt(new TextEncoder().encode(plain));
  const all = new Uint8Array(NONCE_BYTES + sealed.length);
  all.set(nonce, 0);
  all.set(sealed, NONCE_BYTES);
  return PREFIX + toBase64(all);
}

export function decryptString(payload: string, key: Uint8Array): string {
  if (!isEncrypted(payload)) throw new Error("not an encrypted payload");
  if (key.length !== KEY_BYTES) throw new Error("bad key length");
  const raw = fromBase64(payload.slice(PREFIX.length));
  if (raw.length < NONCE_BYTES + 16) throw new Error("payload too short");
  const plain = xchacha20poly1305(key, raw.slice(0, NONCE_BYTES)).decrypt(raw.slice(NONCE_BYTES));
  return new TextDecoder().decode(plain);
}
