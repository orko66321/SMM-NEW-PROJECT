import crypto from "node:crypto";
import { prisma } from "../lib/prisma.js";
const PREFIX_LENGTH = 12;
function hashKey(value) {
    return crypto.createHash("sha256").update(value).digest("hex");
}
/**
 * Returns the plaintext key exactly once — only its sha256 hash and a short
 * prefix (so the profile UI can show "which key is this" without ever being
 * able to re-display the secret) are stored, same shape as
 * RefreshToken.tokenHash. Regenerating silently invalidates any previous key.
 */
export async function generateApiKey(userId) {
    const secret = crypto.randomBytes(32).toString("hex");
    const plaintext = `smm_${secret}`;
    const prefix = plaintext.slice(0, PREFIX_LENGTH);
    await prisma.user.update({
        where: { id: userId },
        data: { apiKeyHash: hashKey(plaintext), apiKeyPrefix: prefix, apiKeyCreatedAt: new Date() },
    });
    return { apiKey: plaintext, prefix };
}
export async function revokeApiKey(userId) {
    await prisma.user.update({
        where: { id: userId },
        data: { apiKeyHash: null, apiKeyPrefix: null, apiKeyCreatedAt: null },
    });
}
/** Used by middleware/auth.ts's X-API-Key fallback path. */
export async function findUserByApiKey(plaintext) {
    return prisma.user.findUnique({
        where: { apiKeyHash: hashKey(plaintext) },
        select: { id: true, role: true, status: true },
    });
}
