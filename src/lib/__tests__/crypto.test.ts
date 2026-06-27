import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { encrypt, decrypt } from "../crypto";

// 32-byte key as 64 hex chars
const VALID_KEY = "a".repeat(64);

describe("crypto encrypt/decrypt", () => {
  let originalKey: string | undefined;

  beforeEach(() => {
    originalKey = process.env.TOKEN_ENCRYPTION_KEY;
    process.env.TOKEN_ENCRYPTION_KEY = VALID_KEY;
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.TOKEN_ENCRYPTION_KEY;
    } else {
      process.env.TOKEN_ENCRYPTION_KEY = originalKey;
    }
  });

  it("round-trips plaintext through encrypt/decrypt", () => {
    const plaintext = "my-secret-oauth-token";
    const ciphertext = encrypt(plaintext);
    expect(decrypt(ciphertext)).toBe(plaintext);
  });

  it("produces ciphertext in iv:authTag:ciphertext format", () => {
    const ciphertext = encrypt("hello");
    const parts = ciphertext.split(":");
    expect(parts).toHaveLength(3);
    expect(parts.every((p) => p.length > 0)).toBe(true);
  });

  it("produces different ciphertext each time (random IV)", () => {
    const a = encrypt("same input");
    const b = encrypt("same input");
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe("same input");
    expect(decrypt(b)).toBe("same input");
  });

  it("round-trips an empty string", () => {
    const ciphertext = encrypt("");
    expect(ciphertext.split(":")).toHaveLength(3);
    expect(decrypt(ciphertext)).toBe("");
  });

  it("handles unicode and multibyte content", () => {
    const plaintext = "héllo 🌍 こんにちは";
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });

  it("throws when TOKEN_ENCRYPTION_KEY is missing (encrypt)", () => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
    expect(() => encrypt("data")).toThrow(/TOKEN_ENCRYPTION_KEY/);
  });

  it("throws when TOKEN_ENCRYPTION_KEY is missing (decrypt)", () => {
    const ciphertext = encrypt("data");
    delete process.env.TOKEN_ENCRYPTION_KEY;
    expect(() => decrypt(ciphertext)).toThrow(/TOKEN_ENCRYPTION_KEY/);
  });

  it("throws when key is wrong length", () => {
    process.env.TOKEN_ENCRYPTION_KEY = "tooshort";
    expect(() => encrypt("data")).toThrow(/64-character hex string/);
  });

  it("throws on malformed ciphertext (missing parts)", () => {
    expect(() => decrypt("onlyonepart")).toThrow(
      /Invalid encrypted token format/
    );
    expect(() => decrypt("iv:authtag")).toThrow(
      /Invalid encrypted token format/
    );
  });

  it("throws when auth tag does not match (tampered ciphertext)", () => {
    const ciphertext = encrypt("authentic");
    const [iv, , data] = ciphertext.split(":");
    // Swap in a bogus auth tag of the right base64 length
    const badAuthTag = Buffer.from("0".repeat(16)).toString("base64");
    const tampered = [iv, badAuthTag, data].join(":");
    expect(() => decrypt(tampered)).toThrow();
  });
});
