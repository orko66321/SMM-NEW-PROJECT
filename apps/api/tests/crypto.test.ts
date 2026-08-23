import { describe, expect, it } from "vitest";
import { decrypt, encrypt } from "../src/lib/crypto.js";

describe("crypto (AES-256-GCM at-rest encryption)", () => {
  it("round-trips plaintext through encrypt/decrypt", () => {
    const plaintext = "super-secret-provider-api-key-12345";
    const ciphertext = encrypt(plaintext);
    expect(ciphertext).not.toContain(plaintext);
    expect(decrypt(ciphertext)).toBe(plaintext);
  });

  it("produces different ciphertext for the same plaintext each time (random IV)", () => {
    const a = encrypt("same-value");
    const b = encrypt("same-value");
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe("same-value");
    expect(decrypt(b)).toBe("same-value");
  });

  it("throws rather than returning corrupted plaintext when ciphertext is tampered with", () => {
    const ciphertext = encrypt("do-not-trust-me-if-modified");
    const parts = ciphertext.split(":");
    // Flip the last character of the ciphertext segment.
    const tamperedPayload = parts[2]!.slice(0, -1) + (parts[2]!.slice(-1) === "A" ? "B" : "A");
    const tampered = [parts[0], parts[1], tamperedPayload].join(":");
    expect(() => decrypt(tampered)).toThrow();
  });

  it("throws on malformed ciphertext instead of silently failing", () => {
    expect(() => decrypt("not-a-valid-ciphertext")).toThrow();
  });
});
