import crypto from "node:crypto";
import { env } from "../env.js";
// AES-256-GCM at-rest encryption for secrets that must live in Postgres
// (provider API keys, payment gateway credentials) rather than .env, so an
// admin can add/rotate a provider or gateway from the UI without a redeploy.
// The key itself never touches the DB — only ENCRYPTION_KEY in .env can
// decrypt what's stored here (see env.ts for its validation).
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // recommended nonce size for GCM
const key = Buffer.from(env.ENCRYPTION_KEY, "base64");
/** Returns `iv:authTag:ciphertext`, each base64, colon-joined for storage as a single text column. */
export function encrypt(plaintext) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":");
}
/**
 * Throws if the ciphertext was tampered with or encrypted under a different
 * key — GCM's auth tag makes this a hard failure rather than silently
 * returning corrupted plaintext, which matters for values like API keys
 * that would otherwise fail confusingly (or dangerously) downstream.
 */
export function decrypt(stored) {
    const parts = stored.split(":");
    if (parts.length !== 3) {
        throw new Error("Malformed ciphertext: expected iv:authTag:ciphertext");
    }
    const [ivB64, authTagB64, ciphertextB64] = parts;
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
    const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, "base64")), decipher.final()]);
    return plaintext.toString("utf8");
}
