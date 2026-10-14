import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { KEY_BYTES, decryptString, encryptString, fromBase64, isEncrypted, toBase64 } from "../../mobile/src/lib/crypto";

const rnd = (n: number) => new Uint8Array(randomBytes(n));
const key = () => rnd(KEY_BYTES);

describe("on-device encryption (history at rest)", () => {
  it("round-trips text, including unicode and large payloads", () => {
    const k = key();
    for (const text of ["", "hello", "胸が痛い 🩺 Ñandú — Привет", JSON.stringify({ a: "x".repeat(200_000) })]) {
      const sealed = encryptString(text, k, rnd);
      expect(isEncrypted(sealed)).toBe(true);
      expect(decryptString(sealed, k)).toBe(text);
    }
  });

  it("hides the plaintext and uses a fresh nonce each time", () => {
    const k = key();
    const a = encryptString("my rash is on my left arm", k, rnd);
    const b = encryptString("my rash is on my left arm", k, rnd);
    expect(a).not.toBe(b);
    expect(a).not.toContain("rash");
  });

  it("rejects tampering (authenticated encryption)", () => {
    const k = key();
    const sealed = encryptString("do not alter me", k, rnd);
    const bytes = fromBase64(sealed.slice(5));
    bytes[bytes.length - 1] ^= 1; // flip one bit in the tag
    expect(() => decryptString("enc1:" + toBase64(bytes), k)).toThrow();
    bytes[bytes.length - 1] ^= 1;
    bytes[30] ^= 1; // flip one bit in the ciphertext
    expect(() => decryptString("enc1:" + toBase64(bytes), k)).toThrow();
  });

  it("fails with the wrong key and on malformed input", () => {
    const sealed = encryptString("secret", key(), rnd);
    expect(() => decryptString(sealed, key())).toThrow();
    expect(() => decryptString("not encrypted", key())).toThrow();
    expect(() => decryptString("enc1:AAAA", key())).toThrow();
    expect(() => encryptString("x", new Uint8Array(16), rnd)).toThrow();
  });

  it("base64 helpers agree with Node's for every length", () => {
    for (let n = 0; n < 40; n++) {
      const b = rnd(n);
      expect(toBase64(b)).toBe(Buffer.from(b).toString("base64"));
      expect(Buffer.from(fromBase64(toBase64(b))).equals(Buffer.from(b))).toBe(true);
    }
  });
});
